import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeliveryRun } from './delivery-run.entity';
import { DeliveryStop } from './delivery-stop.entity';
import { Order } from '../orders/order.entity';
import { User } from '../users/user.entity';
import { DeliveriesService } from './deliveries.service';
import { DeliveriesController } from './deliveries.controller';

@Module({
  imports: [TypeOrmModule.forFeature([DeliveryRun, DeliveryStop, Order, User])],
  providers: [DeliveriesService],
  controllers: [DeliveriesController],
  exports: [DeliveriesService, TypeOrmModule],
})
export class DeliveriesModule {}
