import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Order } from './order.entity';
import { OrderLine } from './order-line.entity';
import { Produce } from '../produce/produce.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderStatus, UserRole } from '../../common/enums';
import { RealtimeService, RealtimeEvents } from '../realtime/realtime.service';
import { AuthUser } from '../../common/decorators/current-user.decorator';

/**
 * Allowed status transitions and which roles may perform each.
 * Pending → Confirmed → Packed → In Transit → Delivered / Disputed.
 */
const TRANSITIONS: Record<OrderStatus, { to: OrderStatus; roles: UserRole[] }[]> = {
  [OrderStatus.PENDING]: [
    { to: OrderStatus.CONFIRMED, roles: [UserRole.FARMER, UserRole.ADMIN] },
    { to: OrderStatus.CANCELLED, roles: [UserRole.BUYER, UserRole.ADMIN] },
  ],
  [OrderStatus.CONFIRMED]: [
    { to: OrderStatus.PACKED, roles: [UserRole.FARMER, UserRole.ADMIN] },
    { to: OrderStatus.CANCELLED, roles: [UserRole.ADMIN] },
  ],
  [OrderStatus.PACKED]: [
    { to: OrderStatus.IN_TRANSIT, roles: [UserRole.DRIVER, UserRole.ADMIN] },
  ],
  [OrderStatus.IN_TRANSIT]: [
    { to: OrderStatus.DELIVERED, roles: [UserRole.DRIVER, UserRole.ADMIN] },
  ],
  [OrderStatus.DELIVERED]: [
    { to: OrderStatus.DISPUTED, roles: [UserRole.BUYER, UserRole.ADMIN] },
  ],
  [OrderStatus.DISPUTED]: [
    { to: OrderStatus.DELIVERED, roles: [UserRole.ADMIN] },
  ],
  [OrderStatus.CANCELLED]: [],
};

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order) private readonly orders: Repository<Order>,
    @InjectRepository(OrderLine) private readonly lines: Repository<OrderLine>,
    private readonly dataSource: DataSource,
    private readonly realtime: RealtimeService,
  ) {}

  /** Create a multi-farmer order atomically, decrementing stock as we go. */
  async create(buyerId: string, dto: CreateOrderDto): Promise<Order> {
    return this.dataSource.transaction(async (mgr) => {
      const produceRepo = mgr.getRepository(Produce);
      let total = 0;
      const lineEntities: OrderLine[] = [];
      const farmerIds = new Set<string>();

      for (const l of dto.lines) {
        const item = await produceRepo.findOne({ where: { id: l.produceId } });
        if (!item) throw new NotFoundException(`Produce ${l.produceId} not found`);
        if (item.isSoldOut) throw new BadRequestException(`${item.name} is sold out`);
        if (Number(item.quantityAvailable) < l.quantity) {
          throw new BadRequestException(
            `Only ${item.quantityAvailable} ${item.unit} of ${item.name} available`,
          );
        }

        item.quantityAvailable = Number(item.quantityAvailable) - l.quantity;
        if (item.quantityAvailable <= 0) item.isSoldOut = true;
        await produceRepo.save(item);

        const lineTotal = Number(item.pricePerUnit) * l.quantity;
        total += lineTotal;
        farmerIds.add(item.farmerId);

        lineEntities.push(
          mgr.getRepository(OrderLine).create({
            produceId: item.id,
            farmerId: item.farmerId,
            productName: item.name,
            unit: item.unit,
            unitPrice: item.pricePerUnit,
            quantityOrdered: l.quantity,
            quantityDelivered: 0,
            harvestDate: item.harvestDate,
          }),
        );
      }

      const reference = `FR-${Date.now().toString(36).toUpperCase()}`;
      const order = mgr.getRepository(Order).create({
        reference,
        buyerId,
        status: OrderStatus.PENDING,
        totalAmount: Math.round(total * 100) / 100,
        deliveryAddress: dto.deliveryAddress ?? null,
        specialInstructions: dto.specialInstructions ?? null,
        requestedDeliveryDate: dto.requestedDeliveryDate ?? null,
        lines: lineEntities,
      });
      const saved = await mgr.getRepository(Order).save(order);

      // Notify each involved farmer in real time that they have a new order.
      for (const farmerId of farmerIds) {
        this.realtime.notifyUser(farmerId, RealtimeEvents.ORDER_PLACED, {
          orderId: saved.id,
          reference: saved.reference,
          total: saved.totalAmount,
        });
      }
      return saved;
    });
  }

  findForBuyer(buyerId: string): Promise<Order[]> {
    return this.orders.find({ where: { buyerId }, order: { createdAt: 'DESC' } });
  }

  /** Orders containing at least one line from this farmer. */
  async findForFarmer(farmerId: string): Promise<Order[]> {
    const rows = await this.lines.find({ where: { farmerId }, select: { orderId: true } });
    const ids = [...new Set(rows.map((r) => r.orderId))];
    if (!ids.length) return [];
    return this.orders.find({ where: ids.map((id) => ({ id })), order: { createdAt: 'DESC' } });
  }

  findAll(): Promise<Order[]> {
    return this.orders.find({ order: { createdAt: 'DESC' } });
  }

  /** Confirmed orders not yet assigned to a delivery run (admin scheduling). */
  findConfirmedUnassigned(): Promise<Order[]> {
    return this.orders.find({
      where: [{ status: OrderStatus.CONFIRMED }, { status: OrderStatus.PACKED }],
      order: { createdAt: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Order> {
    const order = await this.orders.findOne({ where: { id } });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  /** Role-guarded status transition with real-time notifications. */
  async updateStatus(id: string, target: OrderStatus, user: AuthUser): Promise<Order> {
    const order = await this.findOne(id);
    const allowed = TRANSITIONS[order.status].find((t) => t.to === target);
    if (!allowed) {
      throw new BadRequestException(
        `Cannot move order from ${order.status} to ${target}`,
      );
    }
    if (!allowed.roles.includes(user.role)) {
      throw new ForbiddenException(
        `Role ${user.role} cannot move an order to ${target}`,
      );
    }
    // A farmer may only act on orders that include one of their lines.
    if (user.role === UserRole.FARMER && !order.lines.some((l) => l.farmerId === user.id)) {
      throw new ForbiddenException('This order contains none of your produce');
    }
    // A buyer may only act on their own orders.
    if (user.role === UserRole.BUYER && order.buyerId !== user.id) {
      throw new ForbiddenException('Not your order');
    }

    order.status = target;
    const saved = await this.orders.save(order);

    // Notify buyer + all involved farmers of the change.
    this.realtime.notifyUser(order.buyerId, RealtimeEvents.ORDER_STATUS_CHANGED, {
      orderId: order.id,
      reference: order.reference,
      status: target,
    });
    for (const farmerId of new Set(order.lines.map((l) => l.farmerId))) {
      this.realtime.notifyUser(farmerId, RealtimeEvents.ORDER_STATUS_CHANGED, {
        orderId: order.id,
        reference: order.reference,
        status: target,
      });
    }
    return saved;
  }
}
