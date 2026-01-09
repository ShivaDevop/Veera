import { IsString, IsUUID, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateClassDto {
  @ApiProperty({ example: 'school-uuid' })
  @IsUUID()
  schoolId: string;

  @ApiProperty({ example: 'Mathematics 101' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'MATH101' })
  @IsString()
  code: string;

  @ApiProperty({ example: '10', required: false })
  @IsOptional()
  @IsString()
  grade?: string;

  @ApiProperty({ example: '2024-2025', required: false })
  @IsOptional()
  @IsString()
  academicYear?: string;
}

