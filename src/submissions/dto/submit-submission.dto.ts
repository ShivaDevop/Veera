import { IsOptional, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SubmitSubmissionDto {
  @ApiProperty({
    example: { finalNotes: 'Project completed', reflection: 'Learned a lot' },
    description: 'Optional final submission data as JSON',
    required: false,
  })
  @IsOptional()
  @IsObject()
  submittedData?: any;
}

