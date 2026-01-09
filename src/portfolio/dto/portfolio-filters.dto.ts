import { IsOptional, IsEnum, IsUUID, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PortfolioCategory } from './create-portfolio-item.dto';

export class PortfolioFiltersDto {
  @ApiProperty({ example: 'AI', enum: PortfolioCategory, required: false })
  @IsOptional()
  @IsEnum(PortfolioCategory)
  category?: PortfolioCategory;

  @ApiProperty({ example: 'uuid-here', description: 'Filter by project ID', required: false })
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiProperty({ example: true, description: 'Show only featured items', required: false })
  @IsOptional()
  @IsBoolean()
  featured?: boolean;

  @ApiProperty({ example: true, description: 'Show only items with parent consent', required: false })
  @IsOptional()
  @IsBoolean()
  parentConsent?: boolean;

  @ApiProperty({ example: true, description: 'Show only items with school consent', required: false })
  @IsOptional()
  @IsBoolean()
  schoolConsent?: boolean;
}

