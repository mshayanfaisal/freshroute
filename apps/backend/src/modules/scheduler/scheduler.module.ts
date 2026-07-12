import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SchedulerService } from './scheduler.service';
import { SchedulerController } from './scheduler.controller';
import { ProduceModule } from '../produce/produce.module';
import { DeliveryRun } from '../deliveries/delivery-run.entity';

@Module({
  imports: [ProduceModule, TypeOrmModule.forFeature([DeliveryRun])],
  providers: [SchedulerService],
  controllers: [SchedulerController],
})
export class SchedulerModule {}
