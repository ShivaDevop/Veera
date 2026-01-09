import { IsUUID, IsInt, IsNumber, Min, Max, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSkillWalletDto {
  @ApiProperty({
    example: 'student-uuid',
    description: 'Student ID who will receive the skill',
  })
  @IsUUID()
  studentId: string;

  @ApiProperty({
    example: 'skill-uuid',
    description: 'Skill ID to add to student wallet',
  })
  @IsUUID()
  skillId: string;

  @ApiProperty({
    example: 'submission-uuid',
    description: 'Project submission ID (must be graded and from approved project)',
  })
  @IsUUID()
  submissionId: string;

  @ApiProperty({
    example: 1,
    description: 'Initial skill level (default: 1)',
    required: false,
    minimum: 1,
    maximum: 10,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  initialLevel?: number;

  @ApiProperty({
    example: 25.5,
    description: 'Initial progress percentage (default: 0)',
    required: false,
    minimum: 0,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  initialProgress?: number;
}

