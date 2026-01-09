import { IsString, IsOptional, IsBoolean, IsInt, Min, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdatePortfolioItemDto {
  @ApiProperty({ example: 'My Machine Learning Project', required: false })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ example: 'A project demonstrating ML concepts', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: false, required: false })
  @IsOptional()
  @IsBoolean()
  featured?: boolean;

  @ApiProperty({ example: 1, required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  showcaseOrder?: number;

  @ApiProperty({
    example: { tags: ['machine-learning', 'python'], links: [] },
    required: false,
  })
  @IsOptional()
  @IsObject()
  metadata?: any;
}

