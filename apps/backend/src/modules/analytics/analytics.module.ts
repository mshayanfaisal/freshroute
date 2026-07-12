import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from '../orders/order.entity';
import { OrderLine } from '../orders/order-line.entity';
import { Produce } from '../produce/produce.entity';
import { DeliveryStop } from '../deliveries/delivery-stop.entity';
import { AiSuggestion } from '../ai/ai-suggestion.entity';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderLine, Produce, DeliveryStop, AiSuggestion]),
  ],
  providers: [AnalyticsService],
  controllers: [AnalyticsController],
})
export class AnalyticsModule {}
