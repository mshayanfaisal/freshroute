import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Complaint } from './complaint.entity';
import { OrderLine } from '../orders/order-line.entity';
import { CreateComplaintDto } from './dto/create-complaint.dto';
import { UpdateComplaintStatusDto } from './dto/resolve-complaint.dto';
import {
  ComplaintResolution,
  ComplaintStatus,
  DefectSeverity,
  UserRole,
} from '../../common/enums';
import { AiService } from '../ai/ai.service';
import { RealtimeService, RealtimeEvents } from '../realtime/realtime.service';
import { AuthUser } from '../../common/decorators/current-user.decorator';

@Injectable()
export class ComplaintsService {
  constructor(
    @InjectRepository(Complaint) private readonly repo: Repository<Complaint>,
    @InjectRepository(OrderLine) private readonly lines: Repository<OrderLine>,
    private readonly ai: AiService,
    private readonly realtime: RealtimeService,
  ) {}

  /** Buyer submits a complaint; AI classifies it (or the manual category is used). */
  async create(buyer: AuthUser, dto: CreateComplaintDto): Promise<Complaint> {
    const line = await this.lines.findOne({
      where: { id: dto.orderLineId },
      relations: { order: true },
    });
    if (!line) throw new NotFoundException('Order line not found');
    if (line.order.buyerId !== buyer.id) {
      throw new ForbiddenException('You can only complain about your own orders');
    }

    const daysSinceDelivery = line.harvestDate
      ? Math.max(0, Math.floor((Date.now() - new Date(line.order.updatedAt).getTime()) / 86_400_000))
      : 0;

    const classification = await this.ai.classifyComplaint(buyer.id, dto.orderLineId, {
      complaintText: dto.description,
      produceType: line.productName,
      daysSinceDelivery,
    });

    const complaint = this.repo.create({
      buyerId: buyer.id,
      orderLineId: line.id,
      farmerId: line.farmerId,
      description: dto.description,
      photoUrl: dto.photoUrl ?? null,
      status: ComplaintStatus.SUBMITTED,
      // Prefer AI category; fall back to the buyer's manual dropdown selection.
      defectCategory: classification.defectCategory ?? dto.manualCategory ?? null,
      severity: classification.severity ?? null,
      supplierAlertDraft: classification.supplierAlert ?? null,
      aiClassified: !classification.usedFallback,
    });
    const saved = await this.repo.save(complaint);

    // Notify the farmer of the new complaint.
    this.realtime.notifyUser(line.farmerId, RealtimeEvents.COMPLAINT_SUBMITTED, {
      complaintId: saved.id,
      product: line.productName,
      severity: saved.severity,
    });

    // Critical complaints escalate to admins in real time.
    if (saved.severity === DefectSeverity.CRITICAL) {
      this.realtime.notifyRole(UserRole.ADMIN, RealtimeEvents.COMPLAINT_ESCALATED, {
        complaintId: saved.id,
        product: line.productName,
        farmerId: line.farmerId,
      });
    }
    return saved;
  }

  findForBuyer(buyerId: string): Promise<Complaint[]> {
    return this.repo.find({ where: { buyerId }, order: { createdAt: 'DESC' } });
  }

  findForFarmer(farmerId: string): Promise<Complaint[]> {
    return this.repo.find({ where: { farmerId }, order: { createdAt: 'DESC' } });
  }

  findAll(): Promise<Complaint[]> {
    return this.repo.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: string): Promise<Complaint> {
    const c = await this.repo.findOne({ where: { id } });
    if (!c) throw new NotFoundException('Complaint not found');
    return c;
  }

  /** Admin drives the resolution workflow: Submitted → Under Review → Resolved. */
  async updateStatus(id: string, dto: UpdateComplaintStatusDto): Promise<Complaint> {
    const c = await this.findOne(id);

    if (dto.status === ComplaintStatus.RESOLVED) {
      if (!dto.resolution) {
        throw new BadRequestException('A resolution (credit/replace/reject) is required to resolve');
      }
      c.resolution = dto.resolution as ComplaintResolution;
      c.resolvedAt = new Date();
    }
    c.status = dto.status;
    if (dto.resolutionNotes) c.resolutionNotes = dto.resolutionNotes;
    const saved = await this.repo.save(c);

    // Tell the buyer the outcome.
    this.realtime.notifyUser(c.buyerId, RealtimeEvents.COMPLAINT_RESOLVED, {
      complaintId: c.id,
      status: c.status,
      resolution: c.resolution,
    });
    return saved;
  }
}
