import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ComplaintResolution, ComplaintStatus } from '../../../common/enums';

export class UpdateComplaintStatusDto {
  @ApiProperty({ enum: ComplaintStatus })
  @IsEnum(ComplaintStatus)
  status: ComplaintStatus;

  @ApiPropertyOptional({ enum: ComplaintResolution, description: 'Required when resolving' })
  @IsOptional()
  @IsEnum(ComplaintResolution)
  resolution?: ComplaintResolution;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  resolutionNotes?: string;
}
