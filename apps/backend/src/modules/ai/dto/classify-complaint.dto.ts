import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, Min, MinLength } from 'class-validator';

export class ClassifyComplaintDto {
  @ApiProperty({ example: 'The tomatoes arrived bruised and half were already mouldy.' })
  @IsString()
  @MinLength(5)
  complaintText: string;

  @ApiProperty({ example: 'Tomatoes' })
  @IsString()
  produceType: string;

  @ApiProperty({ example: 2, description: 'Days since delivery' })
  @IsInt()
  @Min(0)
  daysSinceDelivery: number;
}
