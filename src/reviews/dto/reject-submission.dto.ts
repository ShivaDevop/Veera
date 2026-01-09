import { IsString, IsNotEmpty, IsOptional, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RejectSubmissionDto {
  @ApiProperty({
    example: 'The submission does not meet the requirements. Please revise and resubmit.',
    description: 'Rejection comment (mandatory)',
  })
  @IsString()
  @IsNotEmpty()
  comment: string;

  @ApiProperty({
    example: 45.0,
    description: 'Optional grade if partial credit given',
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

