import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import configuration from './config/configuration';
import { DatabaseModule } from './database/database.module';
import { HealthController } from './health.controller';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { ProduceModule } from './modules/produce/produce.module';
import { OrdersModule } from './modules/orders/orders.module';
import { DeliveriesModule } from './modules/deliveries/deliveries.module';
import { ComplaintsModule } from './modules/complaints/complaints.module';
import { AiModule } from './modules/ai/ai.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { SchedulerModule } from './modules/scheduler/scheduler.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['.env', '../../.env'],
    }),
    ScheduleModule.forRoot(),
    DatabaseModule,
    RealtimeModule,
    UsersModule,
    AuthModule,
    ProduceModule,
    OrdersModule,
    DeliveriesModule,
    ComplaintsModule,
    AiModule,
    AnalyticsModule,
    SchedulerModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
