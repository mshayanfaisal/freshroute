import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { DeliveryRun } from './delivery-run.entity';
import { DeliveryStop } from './delivery-stop.entity';
import { Order } from '../orders/order.entity';
import { User } from '../users/user.entity';
import { CreateRunDto } from './dto/create-run.dto';
import { UpdateStopDto } from './dto/update-stop.dto';
import {
  DeliveryRunStatus,
  OrderStatus,
  StopStatus,
} from '../../common/enums';
import { RealtimeService, RealtimeEvents } from '../realtime/realtime.service';

@Injectable()
export class DeliveriesService {
  constructor(
    @InjectRepository(DeliveryRun) private readonly runs: Repository<DeliveryRun>,
    @InjectRepository(DeliveryStop) private readonly stops: Repository<DeliveryStop>,
    @InjectRepository(Order) private readonly orders: Repository<Order>,
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly dataSource: DataSource,
    private readonly realtime: RealtimeService,
  ) {}

  /** Admin builds a delivery run: creates stops from orders and moves them In Transit. */
  async createRun(dto: CreateRunDto): Promise<DeliveryRun> {
    const driver = await this.users.findOne({ where: { id: dto.driverId } });
    if (!driver) throw new NotFoundException('Driver not found');

    const runId = await this.dataSource.transaction(async (mgr) => {
      const run = mgr.getRepository(DeliveryRun).create({
        driverId: dto.driverId,
        scheduledDate: dto.scheduledDate,
        status: DeliveryRunStatus.PLANNED,
        stops: [],
      });
      const savedRun = await mgr.getRepository(DeliveryRun).save(run);

      let seq = 1;
      for (const orderId of dto.orderIds) {
        const order = await mgr.getRepository(Order).findOne({
          where: { id: orderId },
          relations: { buyer: true },
        });
        if (!order) throw new NotFoundException(`Order ${orderId} not found`);
        if (![OrderStatus.CONFIRMED, OrderStatus.PACKED].includes(order.status)) {
          throw new BadRequestException(
            `Order ${order.reference} must be confirmed/packed before assignment`,
          );
        }

        const stop = mgr.getRepository(DeliveryStop).create({
          runId: savedRun.id,
          orderId: order.id,
          sequence: seq++,
          address: order.deliveryAddress ?? order.buyer.address ?? 'Address on file',
          latitude: order.buyer.latitude,
          longitude: order.buyer.longitude,
          specialInstructions: order.specialInstructions,
          status: StopStatus.PENDING,
        });
        await mgr.getRepository(DeliveryStop).save(stop);

        order.status = OrderStatus.IN_TRANSIT;
        await mgr.getRepository(Order).save(order);
        this.realtime.notifyUser(order.buyerId, RealtimeEvents.ORDER_STATUS_CHANGED, {
          orderId: order.id,
          reference: order.reference,
          status: OrderStatus.IN_TRANSIT,
        });
      }

      // Notify the driver of the new assignment.
      this.realtime.notifyUser(dto.driverId, RealtimeEvents.DELIVERY_ASSIGNED, {
        runId: savedRun.id,
        scheduledDate: savedRun.scheduledDate,
        stopCount: dto.orderIds.length,
      });

      return savedRun.id;
    });

    // Fetch AFTER the transaction commits so the run (and its stops) are visible.
    return this.findRun(runId);
  }

  findRun(id: string): Promise<DeliveryRun> {
    return this.runs.findOne({ where: { id } }).then((r) => {
      if (!r) throw new NotFoundException('Delivery run not found');
      r.stops?.sort((a, b) => a.sequence - b.sequence);
      return r;
    });
  }

  findRunsForDriver(driverId: string): Promise<DeliveryRun[]> {
    return this.runs.find({ where: { driverId }, order: { scheduledDate: 'DESC' } });
  }

  findAllRuns(): Promise<DeliveryRun[]> {
    return this.runs.find({ order: { scheduledDate: 'DESC' } });
  }

  /** Driver marks a stop delivered/failed. Updates the order + notifies the buyer. */
  async updateStop(
    stopId: string,
    driverId: string,
    dto: UpdateStopDto,
    isAdmin: boolean,
  ): Promise<DeliveryStop> {
    const stop = await this.stops.findOne({
      where: { id: stopId },
      relations: { run: true, order: true },
    });
    if (!stop) throw new NotFoundException('Stop not found');
    if (!isAdmin && stop.run.driverId !== driverId) {
      throw new ForbiddenException('This stop is not on your run');
    }
    if (dto.status === StopStatus.FAILED && !dto.failureReason) {
      throw new BadRequestException('failureReason is required for a failed stop');
    }

    stop.status = dto.status;
    stop.failureReason = dto.status === StopStatus.FAILED ? dto.failureReason! : null;
    stop.completedAt = new Date();
    await this.stops.save(stop);

    // Reflect on the order: delivered → mark delivered + fulfil line quantities.
    const order = await this.orders.findOne({ where: { id: stop.orderId } });
    if (order) {
      if (dto.status === StopStatus.DELIVERED) {
        order.status = OrderStatus.DELIVERED;
        for (const line of order.lines) line.quantityDelivered = line.quantityOrdered;
        await this.orders.save(order);
      } else {
        order.status = OrderStatus.DISPUTED;
        await this.orders.save(order);
      }
      this.realtime.notifyUser(order.buyerId, RealtimeEvents.STOP_UPDATED, {
        orderId: order.id,
        reference: order.reference,
        stopStatus: dto.status,
        failureReason: stop.failureReason,
      });
    }

    // Complete the run when every stop is resolved.
    const run = await this.findRun(stop.runId);
    if (run.stops.every((s) => s.status !== StopStatus.PENDING)) {
      run.status = DeliveryRunStatus.COMPLETED;
      await this.runs.save(run);
    } else if (run.status === DeliveryRunStatus.PLANNED) {
      run.status = DeliveryRunStatus.IN_PROGRESS;
      await this.runs.save(run);
    }

    return stop;
  }

  /** Persist a new stop sequence (e.g. after accepting the AI route suggestion). */
  async reorderStops(runId: string, driverId: string, stopIds: string[], isAdmin: boolean): Promise<DeliveryRun> {
    const run = await this.findRun(runId);
    if (!isAdmin && run.driverId !== driverId) throw new ForbiddenException('Not your run');

    const idSet = new Set(run.stops.map((s) => s.id));
    if (stopIds.length !== run.stops.length || !stopIds.every((id) => idSet.has(id))) {
      throw new BadRequestException('stopIds must be a permutation of the run’s stops');
    }
    let seq = 1;
    for (const id of stopIds) {
      await this.stops.update({ id }, { sequence: seq++ });
    }
    return this.findRun(runId);
  }
}
