import { IsString, IsInt, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSubjectDto {
  @ApiProperty({ example: 'uuid-here' })
  @IsUUID()
  gradeId: string;

  @ApiProperty({ example: 'Mathematics' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'MATH', description: 'Subject code', required: false })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiProperty({ example: 'Mathematics curriculum', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 0, description: 'Display order', required: false })
  @IsOptional()
  @IsInt()
  order?: number;
}

