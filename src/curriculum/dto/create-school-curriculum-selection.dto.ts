import { IsString, IsOptional, IsUUID, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSchoolCurriculumSelectionDto {
  @ApiProperty({ example: 'uuid-here' })
  @IsUUID()
  schoolId: string;

  @ApiProperty({ example: 'uuid-here' })
  @IsUUID()
  curriculumId: string;

  @ApiProperty({ example: 'Selected for 2024 academic year', required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

