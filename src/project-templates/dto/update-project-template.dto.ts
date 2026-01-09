import { IsString, IsOptional, IsEnum, IsArray, IsBoolean, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ProjectCategory, SkillMappingDto } from './create-project-template.dto';

export class UpdateProjectTemplateDto {
  @ApiProperty({ example: 'Machine Learning Basics', required: false })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ example: 'Introduction to machine learning concepts', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'AI', enum: ProjectCategory, required: false })
  @IsOptional()
  @IsEnum(ProjectCategory)
  category?: ProjectCategory;

  @ApiProperty({
    example: [
      { skillId: 'uuid-here', requiredLevel: 3 },
      { skillId: 'uuid-here', requiredLevel: 2 },
    ],
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
      ],
    },
    required: false,
  })
  @IsOptional()
  rubric?: any;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

