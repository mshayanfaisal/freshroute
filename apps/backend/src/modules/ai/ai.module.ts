import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiService } from './ai.service';
import { AiInsightsService } from './ai-insights.service';
import { AiController } from './ai.controller';
import { AiSuggestion } from './ai-suggestion.entity';
import { OrderLine } from '../orders/order-line.entity';
import { Produce } from '../produce/produce.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AiSuggestion, OrderLine, Produce])],
  providers: [AiService, AiInsightsService],
  controllers: [AiController],
  // Exported so ComplaintsModule can reuse the classifier and AnalyticsModule the log.
  exports: [AiService, TypeOrmModule],
})
export class AiModule {}
