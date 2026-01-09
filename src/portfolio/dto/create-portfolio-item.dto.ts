import { IsString, IsOptional, IsBoolean, IsUUID, IsEnum, IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum PortfolioCategory {
  AI = 'AI',
  Robotics = 'Robotics',
  Web = 'Web',
  Data = 'Data',
}

export class CreatePortfolioItemDto {
  @ApiProperty({ example: 'uuid-here', description: 'Submission ID to add to portfolio' })
  @IsUUID()
  submissionId: string;

  @ApiProperty({ example: 'My Machine Learning Project', required: false })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ example: 'A project demonstrating ML concepts', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: false, description: 'Feature this item in portfolio', required: false })
  @IsOptional()
  @IsBoolean()
  featured?: boolean;

  @ApiProperty({ example: 1, description: 'Display order in showcase', required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  showcaseOrder?: number;
}

