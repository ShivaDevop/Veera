import { IsOptional, IsDateString, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum ReportType {
  STUDENTS = 'students',
  TEACHERS = 'teachers',
  CLASSES = 'classes',
  PROJECTS = 'projects',
  SUBMISSIONS = 'submissions',
  SKILLS = 'skills',
  OVERVIEW = 'overview',
}

export class ReportQueryDto {
  @ApiPropertyOptional({ description: 'Report type', enum: ReportType })
  @IsOptional()
  @IsEnum(ReportType)
  type?: ReportType;

  @ApiPropertyOptional({ description: 'Start date for report', type: String })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date for report', type: String })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Class ID filter' })
  @IsOptional()
  @IsString()
  classId?: string;
}

