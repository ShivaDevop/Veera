import { IsString, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ApproveCurriculumDto {
  @ApiPropertyOptional({ description: 'Approval notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class PublishCurriculumDto {
  @ApiPropertyOptional({ description: 'Publishing notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class ArchiveCurriculumDto {
  @ApiPropertyOptional({ description: 'Archive reason' })
  @IsOptional()
  @IsString()
  reason?: string;
}

