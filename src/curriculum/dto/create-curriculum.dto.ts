import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCurriculumDto {
  @ApiProperty({ example: 'STEM Curriculum 2024' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'Comprehensive STEM curriculum', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: '1.0' })
  @IsString()
  version: string;
}

