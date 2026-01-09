import { IsInt, IsNumber, Min, Max, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateSkillMaturityDto {
  @ApiProperty({
    example: 2,
    description: 'New skill level (must be >= current level, can only increase by 1)',
    required: false,
    minimum: 1,
    maximum: 10,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  level?: number;

  @ApiProperty({
    example: 50.0,
    description: 'New progress percentage (must be >= current progress)',
    required: false,
    minimum: 0,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  progress?: number;
}

