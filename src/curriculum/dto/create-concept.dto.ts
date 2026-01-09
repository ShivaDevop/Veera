import { IsString, IsInt, IsOptional, IsUUID, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateConceptDto {
  @ApiProperty({ example: 'uuid-here' })
  @IsUUID()
  chapterId: string;

  @ApiProperty({ example: 'Variables and Expressions' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'Understanding variables and basic expressions', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    example: ['Define variables', 'Write expressions', 'Evaluate expressions'],
    description: 'Learning objectives',
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  learningObjectives?: string[];

  @ApiProperty({ example: 0, description: 'Display order', required: false })
  @IsOptional()
  @IsInt()
  order?: number;
}

