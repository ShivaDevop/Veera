import { IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdatePortfolioPrivacyDto {
  @ApiProperty({
    example: true,
    description: 'Parent consent for public showcase',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  parentConsent?: boolean;

  @ApiProperty({
    example: true,
    description: 'School consent for public showcase',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  schoolConsent?: boolean;
}

