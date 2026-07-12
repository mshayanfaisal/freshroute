import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { StopStatus } from '../../../common/enums';

export class UpdateStopDto {
  @ApiProperty({ enum: [StopStatus.DELIVERED, StopStatus.FAILED] })
  @IsEnum(StopStatus)
  status: StopStatus;

  @ApiPropertyOptional({ description: 'Required when status = failed' })
  @IsOptional()
  @IsString()
  failureReason?: string;
}

export class ReorderStopsDto {
  @ApiProperty({ type: [String], description: 'Stop ids in the new sequence' })
  @IsString({ each: true })
  stopIds: string[];
}
