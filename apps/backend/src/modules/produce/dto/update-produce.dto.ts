import { PartialType } from '@nestjs/swagger';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateProduceDto } from './create-produce.dto';

export class UpdateProduceDto extends PartialType(CreateProduceDto) {
  @ApiPropertyOptional({ description: 'Mark the listing sold out (real-time)' })
  @IsOptional()
  @IsBoolean()
  isSoldOut?: boolean;
}
