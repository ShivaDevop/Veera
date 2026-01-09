import { IsString, IsInt, IsOptional, IsBoolean, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateGradeDto {
  @ApiProperty({ example: 'Grade 1', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ example: 1, required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  level?: number;

  @ApiProperty({ example: 'First grade curriculum', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 0, required: false })
  @IsOptional()
  @IsInt()
  order?: number;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

