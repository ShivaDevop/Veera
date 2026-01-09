import { IsString, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateSkillDto {
  @ApiProperty({ example: 'JavaScript', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ example: 'Programming', required: false })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({ example: 'Programming language', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

