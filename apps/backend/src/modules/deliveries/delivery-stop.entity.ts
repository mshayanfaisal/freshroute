import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { StopStatus } from '../../common/enums';
import { DeliveryRun } from './delivery-run.entity';
import { Order } from '../orders/order.entity';

/** A single stop on a delivery run, linked to the order being delivered. */
@Entity('delivery_stops')
export class DeliveryStop {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @ManyToOne(() => DeliveryRun, (r) => r.stops, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'run_id' })
  run: DeliveryRun;

  @Column({ name: 'run_id' })
  runId: string;

  @ManyToOne(() => Order, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Column({ name: 'order_id' })
  orderId: string;

  /** Ordering within the run (1-based). The route optimiser rewrites this. */
  @Column({ type: 'int', name: 'sequence' })
  sequence: number;

  @Column()
  address: string;

  @Column({ type: 'double precision', nullable: true })
  latitude: number | null;

  @Column({ type: 'double precision', nullable: true })
  longitude: number | null;

  @Column({ name: 'special_instructions', type: 'text', nullable: true })
  specialInstructions: string | null;

  @Column({ type: 'enum', enum: StopStatus, default: StopStatus.PENDING })
  status: StopStatus;

  @Column({ name: 'failure_reason', type: 'text', nullable: true })
  failureReason: string | null;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date | null;
}
