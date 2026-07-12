import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

export class OrderLineInput {
  @ApiProperty({ description: 'Produce listing id' })
  @IsUUID()
  produceId: string;

  @ApiProperty({ example: 20 })
  @IsNumber()
  @Min(0.01)
  quantity: number;
}

export class CreateOrderDto {
  @ApiProperty({ type: [OrderLineInput], description: 'Line items — may span multiple farmers' })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OrderLineInput)
  lines: OrderLineInput[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  deliveryAddress?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  specialInstructions?: string;

  @ApiPropertyOptional({ example: '2026-07-12' })
  @IsOptional()
  @IsDateString()
  requestedDeliveryDate?: string;
}
