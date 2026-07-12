import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { OrderStatus } from '../../common/enums';
import { User } from '../users/user.entity';
import { OrderLine } from './order-line.entity';

/**
 * A buyer order. May contain line items sourced from multiple farmers.
 * Status transitions are role-guarded in OrdersService.
 */
@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Human-friendly sequential reference, e.g. FR-000123. */
  @Index({ unique: true })
  @Column({ name: 'reference' })
  reference: string;

  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.PENDING })
  status: OrderStatus;

  @Index()
  @ManyToOne(() => User, (u) => u.orders, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'buyer_id' })
  buyer: User;

  @Column({ name: 'buyer_id' })
  buyerId: string;

  @Column({ type: 'numeric', precision: 12, scale: 2, name: 'total_amount', default: 0 })
  totalAmount: number;

  @Column({ name: 'delivery_address', type: 'varchar', nullable: true })
  deliveryAddress: string | null;

  @Column({ name: 'special_instructions', type: 'text', nullable: true })
  specialInstructions: string | null;

  @Column({ name: 'requested_delivery_date', type: 'date', nullable: true })
  requestedDeliveryDate: string | null;

  @OneToMany(() => OrderLine, (l) => l.order, { cascade: true, eager: true })
  lines: OrderLine[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
