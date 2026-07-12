import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Produce } from './produce.entity';
import { ProduceService } from './produce.service';
import { ProduceController } from './produce.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Produce])],
  providers: [ProduceService],
  controllers: [ProduceController],
  exports: [ProduceService],
})
export class ProduceModule {}
