import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import {
  ComplaintResolution,
  ComplaintStatus,
  DefectCategory,
  DefectSeverity,
} from '../../common/enums';
import { User } from '../users/user.entity';
import { OrderLine } from '../orders/order-line.entity';

/**
 * A quality complaint raised by a buyer against a specific order line.
 * Resolution workflow: Submitted → Under Review → Resolved.
 */
@Entity('complaints')
export class Complaint {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @ManyToOne(() => User, (u) => u.complaints, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'buyer_id' })
  buyer: User;

  @Column({ name: 'buyer_id' })
  buyerId: string;

  @ManyToOne(() => OrderLine, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_line_id' })
  orderLine: OrderLine;

  @Column({ name: 'order_line_id' })
  orderLineId: string;

  @Index()
  @Column({ name: 'farmer_id' })
  farmerId: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ name: 'photo_url', type: 'varchar', nullable: true })
  photoUrl: string | null;

  @Column({ type: 'enum', enum: ComplaintStatus, default: ComplaintStatus.SUBMITTED })
  status: ComplaintStatus;

  // ---- AI-classified fields (nullable when AI unavailable → manual dropdown) ----
  @Column({ type: 'enum', enum: DefectCategory, nullable: true, name: 'defect_category' })
  defectCategory: DefectCategory | null;

  @Column({ type: 'enum', enum: DefectSeverity, nullable: true })
  severity: DefectSeverity | null;

  @Column({ name: 'supplier_alert_draft', type: 'text', nullable: true })
  supplierAlertDraft: string | null;

  @Column({ name: 'ai_classified', default: false })
  aiClassified: boolean;

  // ---- Resolution ----
  @Column({ type: 'enum', enum: ComplaintResolution, nullable: true })
  resolution: ComplaintResolution | null;

  @Column({ name: 'resolution_notes', type: 'text', nullable: true })
  resolutionNotes: string | null;

  @Column({ name: 'resolved_at', type: 'timestamptz', nullable: true })
  resolvedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
