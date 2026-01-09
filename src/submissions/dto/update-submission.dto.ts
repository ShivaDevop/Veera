import { IsOptional, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateSubmissionDto {
  @ApiProperty({
    example: { notes: 'Updated notes', progress: 75 },
    description: 'Submission data as JSON',
    required: false,
  })
  @IsOptional()
  @IsObject()
  submittedData?: any;
}

