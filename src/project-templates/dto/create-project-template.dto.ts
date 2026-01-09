import { IsString, IsOptional, IsEnum, IsArray, IsInt, Min, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum ProjectCategory {
  AI = 'AI',
  Robotics = 'Robotics',
  Web = 'Web',
  Data = 'Data',
}

export class SkillMappingDto {
  @ApiProperty({ example: 'uuid-here' })
  @IsString()
  skillId: string;

  @ApiProperty({ example: 3, description: 'Required skill level (optional)', required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  requiredLevel?: number;
}

export class CreateProjectTemplateDto {
  @ApiProperty({ example: 'Machine Learning Basics' })
  @IsString()
  title: string;

  @ApiProperty({ example: 'Introduction to machine learning concepts', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'AI', enum: ProjectCategory })
  @IsEnum(ProjectCategory)
  category: ProjectCategory;

  @ApiProperty({
    example: [
      { skillId: 'uuid-here', requiredLevel: 3 },
      { skillId: 'uuid-here', requiredLevel: 2 },
    ],
    description: 'Skills mapped to this template',
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SkillMappingDto)
  skillMappings?: SkillMappingDto[];

  @ApiProperty({
    example: {
      criteria: [
        { name: 'Code Quality', maxPoints: 25 },
        { name: 'Documentation', maxPoints: 15 },
        { name: 'Functionality', maxPoints: 40 },
        { name: 'Creativity', maxPoints: 20 },
      ],
      totalPoints: 100,
    },
    description: 'Optional rubric as JSON',
    required: false,
  })
  @IsOptional()
  rubric?: any;
}

