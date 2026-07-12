import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'farmer@greenvalley.coop' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Str0ngPass!' })
  @IsString()
  password: string;
}
