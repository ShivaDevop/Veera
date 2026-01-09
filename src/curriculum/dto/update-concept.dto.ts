import { IsString, IsInt, IsOptional, IsBoolean, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateConceptDto {
  @ApiProperty({ example: 'Variables and Expressions', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ example: 'Understanding variables and basic expressions', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    example: ['Define variables', 'Write expressions', 'Evaluate expressions'],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  learningObjectives?: string[];

  @ApiProperty({ example: 0, required: false })
  @IsOptional()
  @IsInt()
  order?: number;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

