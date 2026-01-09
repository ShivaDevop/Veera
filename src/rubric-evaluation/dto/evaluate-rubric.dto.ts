import { IsObject, IsOptional, IsString, IsNumber, Min, Max, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CriterionScoreDto {
  @ApiProperty({ example: 'criterion-1', description: 'Criterion ID or name' })
  @IsString()
  criterionId: string;

  @ApiProperty({ example: 8.5, description: 'Score for this criterion', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  score?: number;

  @ApiProperty({ example: 'Good work, but could use more detail', required: false })
  @IsOptional()
  @IsString()
  comment?: string;
}

export class EvaluateRubricDto {
  @ApiProperty({
    example: [
      {
        criterionId: 'code-quality',
        score: 8.5,
        comment: 'Well-structured code with good practices',
      },
      {
        criterionId: 'documentation',
        score: 7.0,
        comment: 'Good documentation, but could be more comprehensive',
      },
    ],
    description: 'Scores and comments for each criterion (optional)',
    required: false,
  })
  @IsOptional()
  @IsObject()
  scores?: Record<string, { score?: number; comment?: string }>;

  @ApiProperty({
    example: 85.5,
    description: 'Overall/aggregated score (optional)',
    required: false,
    minimum: 0,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  overallScore?: number;

  @ApiProperty({
    example: 'Overall, this is a strong submission demonstrating good understanding of the concepts.',
    description: 'Overall evaluation comment (optional)',
    required: false,
  })
  @IsOptional()
  @IsString()
  overallComment?: string;
}

