import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserRole } from '../../common/enums';
import { Produce } from '../produce/produce.entity';
import { Order } from '../orders/order.entity';
import { DeliveryRun } from '../deliveries/delivery-run.entity';
import { Complaint } from '../complaints/complaint.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column()
  email: string;

  @Column({ name: 'password_hash' })
  passwordHash: string;

  @Column()
  name: string;

  @Column({ type: 'enum', enum: UserRole })
  role: UserRole;

  /** Farm or business name (farmers/buyers). Optional for drivers/admins. */
  @Column({ name: 'org_name', type: 'varchar', nullable: true })
  orgName: string | null;

  /** Delivery / pickup address; used by the map tracker and route optimiser. */
  @Column({ type: 'varchar', nullable: true })
  address: string | null;

  @Column({ type: 'double precision', nullable: true })
  latitude: number | null;

  @Column({ type: 'double precision', nullable: true })
  longitude: number | null;

  @Column({ type: 'varchar', nullable: true })
  phone: string | null;

  /** Hashed current refresh token — enables refresh-token rotation & revocation. */
  @Column({ name: 'refresh_token_hash', nullable: true, type: 'text' })
  refreshTokenHash: string | null;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => Produce, (p) => p.farmer)
  listings: Produce[];

  @OneToMany(() => Order, (o) => o.buyer)
  orders: Order[];

  @OneToMany(() => DeliveryRun, (r) => r.driver)
  deliveryRuns: DeliveryRun[];

  @OneToMany(() => Complaint, (c) => c.buyer)
  complaints: Complaint[];
}
