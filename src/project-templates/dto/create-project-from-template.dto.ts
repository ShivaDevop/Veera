import { IsString, IsOptional, IsDateString, IsArray, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateProjectFromTemplateDto {
  @ApiProperty({ example: 'uuid-here', description: 'Project template ID' })
  @IsUUID()
  templateId: string;

  @ApiProperty({ example: 'ML Project - John Doe', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ example: '2024-01-01T00:00:00Z', required: false })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({ example: '2024-12-31T23:59:59Z', required: false })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({ example: ['uuid-here'], description: 'Student IDs to assign to', required: false })
  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  studentIds?: string[];

  @ApiProperty({ example: '2024-12-31T23:59:59Z', description: 'Due date for assignments', required: false })
  @IsOptional()
  @IsDateString()
  dueDate?: string;
}

