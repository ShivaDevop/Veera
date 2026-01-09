import { IsString, IsInt, IsOptional, IsUUID, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateGradeDto {
  @ApiProperty({ example: 'uuid-here' })
  @IsUUID()
  curriculumId: string;

  @ApiProperty({ example: 'Grade 1' })
  @IsString()
  name: string;

  @ApiProperty({ example: 1, description: 'Grade level (1, 2, 3, etc.)' })
  @IsInt()
  @Min(1)
  level: number;

  @ApiProperty({ example: 'First grade curriculum', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 0, description: 'Display order', required: false })
  @IsOptional()
  @IsInt()
  order?: number;
}

