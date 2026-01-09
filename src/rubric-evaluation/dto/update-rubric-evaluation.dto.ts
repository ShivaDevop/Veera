import { IsObject, IsOptional, IsString, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateRubricEvaluationDto {
  @ApiProperty({
    example: {
      'code-quality': { score: 9.0, comment: 'Excellent code quality' },
      'documentation': { score: 8.0, comment: 'Updated documentation' },
    },
    required: false,
  })
  @IsOptional()
  @IsObject()
  scores?: Record<string, { score?: number; comment?: string }>;

  @ApiProperty({ example: 90.0, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  overallScore?: number;

  @ApiProperty({ example: 'Updated overall comment', required: false })
  @IsOptional()
  @IsString()
  overallComment?: string;
}

