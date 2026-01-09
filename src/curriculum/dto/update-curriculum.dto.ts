import { IsString, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateCurriculumDto {
  @ApiProperty({ example: 'STEM Curriculum 2024', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ example: 'Comprehensive STEM curriculum', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: '1.1', required: false })
  @IsOptional()
  @IsString()
  version?: string;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

