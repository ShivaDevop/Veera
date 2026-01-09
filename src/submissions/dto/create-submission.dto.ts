import { IsString, IsOptional, IsUUID, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSubmissionDto {
  @ApiProperty({ example: 'uuid-here' })
  @IsUUID()
  projectId: string;

  @ApiProperty({ example: 'uuid-here', required: false })
  @IsOptional()
  @IsUUID()
  assignmentId?: string;

  @ApiProperty({
    example: { notes: 'Work in progress', progress: 50 },
    description: 'Optional submission data as JSON',
    required: false,
  })
  @IsOptional()
  @IsObject()
  submittedData?: any;
}

