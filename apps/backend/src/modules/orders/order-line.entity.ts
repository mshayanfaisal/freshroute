import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Order } from './order.entity';
import { Produce } from '../produce/produce.entity';
import { User } from '../users/user.entity';

/**
 * One line of an order. Tracks quantity ordered vs delivered to support
 * partial fulfilment, and denormalises the farmer for per-farmer notifications.
 */
@Entity('order_lines')
export class OrderLine {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @ManyToOne(() => Order, (o) => o.lines, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Column({ name: 'order_id' })
  orderId: string;

  @ManyToOne(() => Produce, (p) => p.orderLines, { eager: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'produce_id' })
  produce: Produce;

  @Column({ name: 'produce_id', type: 'uuid', nullable: true })
  produceId: string | null;

  /** Denormalised so we can notify/aggregate by farmer even if a listing is deleted. */
  @Index()
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'farmer_id' })
  farmer: User;

  @Column({ name: 'farmer_id' })
  farmerId: string;

  /** Snapshot of product name at time of order (traceability). */
  @Column({ name: 'product_name' })
  productName: string;

  @Column({ name: 'unit' })
  unit: string;

  @Column({ type: 'numeric', precision: 10, scale: 2, name: 'unit_price' })
  unitPrice: number;

  @Column({ type: 'numeric', precision: 10, scale: 2, name: 'quantity_ordered' })
  quantityOrdered: number;

  @Column({ type: 'numeric', precision: 10, scale: 2, name: 'quantity_delivered', default: 0 })
  quantityDelivered: number;

  /** Snapshot of harvest date for full farm-to-table traceability. */
  @Column({ type: 'date', name: 'harvest_date', nullable: true })
  harvestDate: string | null;
}
