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
import { DeliveryRunStatus } from '../../common/enums';
import { User } from '../users/user.entity';
import { DeliveryStop } from './delivery-stop.entity';

/** A driver's route for a given day, composed of ordered stops. */
@Entity('delivery_runs')
export class DeliveryRun {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @ManyToOne(() => User, (u) => u.deliveryRuns, { eager: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'driver_id' })
  driver: User;

  @Column({ name: 'driver_id', type: 'uuid', nullable: true })
  driverId: string | null;

  @Column({ type: 'date', name: 'scheduled_date' })
  scheduledDate: string;

  @Column({ type: 'enum', enum: DeliveryRunStatus, default: DeliveryRunStatus.PLANNED })
  status: DeliveryRunStatus;

  @Column({ type: 'varchar', nullable: true })
  notes: string | null;

  @OneToMany(() => DeliveryStop, (s) => s.run, { cascade: true, eager: true })
  stops: DeliveryStop[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
