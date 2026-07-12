import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';
import { DefectCategory } from '../../../common/enums';

export class CreateComplaintDto {
  @ApiProperty({ description: 'Order line the complaint is about' })
  @IsUUID()
  orderLineId: string;

  @ApiProperty({ example: 'Half the lettuce was wilted on arrival.' })
  @IsString()
  @MinLength(5)
  description: string;

  @ApiPropertyOptional({ description: 'Optional photo URL/data reference' })
  @IsOptional()
  @IsString()
  photoUrl?: string;

  @ApiPropertyOptional({
    enum: DefectCategory,
    description: 'Manual category — used as the fallback when AI is unavailable',
  })
  @IsOptional()
  @IsEnum(DefectCategory)
  manualCategory?: DefectCategory;
}
