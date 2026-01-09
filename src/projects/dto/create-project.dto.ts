import { IsString, IsOptional, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateProjectDto {
  @ApiProperty({ example: 'Science Fair Project' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'Annual science fair project', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'draft', required: false })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty({ example: '2024-01-01T00:00:00Z', required: false })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({ example: '2024-12-31T23:59:59Z', required: false })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

