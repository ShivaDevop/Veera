import { IsString, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateClassDto {
  @ApiProperty({ example: 'Mathematics 101', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ example: 'MATH101', required: false })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiProperty({ example: '10', required: false })
  @IsOptional()
  @IsString()
  grade?: string;

  @ApiProperty({ example: '2024-2025', required: false })
  @IsOptional()
  @IsString()
  academicYear?: string;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

