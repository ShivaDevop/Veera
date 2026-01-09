import { IsOptional, IsString, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ApproveSubmissionDto {
  @ApiProperty({
    example: 'Great work! Excellent implementation.',
    description: 'Optional approval comment',
    required: false,
  })
  @IsOptional()
  @IsString()
  comment?: string;

  @ApiProperty({
    example: 85.5,
    description: 'Optional grade (0-100)',
    required: false,
    minimum: 0,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  grade?: number;
}

