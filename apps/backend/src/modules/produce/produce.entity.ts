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
import { ProduceCategory, SpoilageRisk } from '../../common/enums';
import { User } from '../users/user.entity';
import { OrderLine } from '../orders/order-line.entity';

@Entity('produce')
export class Produce {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'varchar', nullable: true })
  variety: string | null;

  @Column({ type: 'enum', enum: ProduceCategory })
  category: ProduceCategory;

  /** Unit of sale, e.g. kg, dozen, crate, litre. */
  @Column()
  unit: string;

  @Column({ type: 'numeric', precision: 10, scale: 2, name: 'price_per_unit' })
  pricePerUnit: number;

  @Column({ type: 'numeric', precision: 10, scale: 2, name: 'quantity_available' })
  quantityAvailable: number;

  @Column({ type: 'date', name: 'harvest_date' })
  harvestDate: string;

  /** Typical shelf life in days for this produce type — drives spoilage scoring. */
  @Column({ type: 'int', name: 'shelf_life_days' })
  shelfLifeDays: number;

  /** Denormalised spoilage risk, recomputed on read/cron for fast catalogue filtering. */
  @Column({ type: 'enum', enum: SpoilageRisk, default: SpoilageRisk.LOW, name: 'spoilage_risk' })
  spoilageRisk: SpoilageRisk;

  @Column({ name: 'is_sold_out', default: false })
  isSoldOut: boolean;

  @Index()
  @ManyToOne(() => User, (u) => u.listings, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'farmer_id' })
  farmer: User;

  @Column({ name: 'farmer_id' })
  farmerId: string;

  @OneToMany(() => OrderLine, (l) => l.produce)
  orderLines: OrderLine[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
