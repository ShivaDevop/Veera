import { IsString, IsInt, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateSubjectDto {
  @ApiProperty({ example: 'Mathematics', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ example: 'MATH', required: false })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiProperty({ example: 'Mathematics curriculum', required: false })
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

