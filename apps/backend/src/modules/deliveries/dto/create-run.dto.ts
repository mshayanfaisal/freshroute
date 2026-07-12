import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsUUID,
} from 'class-validator';

export class CreateRunDto {
  @ApiProperty({ description: 'Driver user id' })
  @IsUUID()
  driverId: string;

  @ApiProperty({ example: '2026-07-12' })
  @IsDateString()
  scheduledDate: string;

  @ApiProperty({ type: [String], description: 'Order ids to include as stops, in initial sequence' })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  orderIds: string[];
}
