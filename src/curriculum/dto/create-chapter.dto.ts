import { IsString, IsInt, IsOptional, IsUUID, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateChapterDto {
  @ApiProperty({ example: 'uuid-here' })
  @IsUUID()
  subjectId: string;

  @ApiProperty({ example: 'Introduction to Algebra' })
  @IsString()
  name: string;

  @ApiProperty({ example: 1, description: 'Chapter number', required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  number?: number;

  @ApiProperty({ example: 'Basic algebra concepts', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 0, description: 'Display order', required: false })
  @IsOptional()
  @IsInt()
  order?: number;
}

