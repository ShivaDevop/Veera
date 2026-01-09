import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSkillDto {
  @ApiProperty({ example: 'JavaScript' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'Programming', required: false })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({ example: 'Programming language', required: false })
  @IsOptional()
  @IsString()
  description?: string;
}

