import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { ProduceCategory } from '../../../common/enums';

export class CreateProduceDto {
  @ApiProperty({ example: 'Tomatoes' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Roma' })
  @IsOptional()
  @IsString()
  variety?: string;

  @ApiProperty({ enum: ProduceCategory })
  @IsEnum(ProduceCategory)
  category: ProduceCategory;

  @ApiProperty({ example: 'kg' })
  @IsString()
  unit: string;

  @ApiProperty({ example: 3.5 })
  @IsNumber()
  @Min(0)
  pricePerUnit: number;

  @ApiProperty({ example: 120 })
  @IsNumber()
  @Min(0)
  quantityAvailable: number;

  @ApiProperty({ example: '2026-07-08' })
  @IsDateString()
  harvestDate: string;

  @ApiPropertyOptional({ example: 7, description: 'Defaults to category shelf life if omitted' })
  @IsOptional()
  @IsInt()
  @Min(1)
  shelfLifeDays?: number;
}
