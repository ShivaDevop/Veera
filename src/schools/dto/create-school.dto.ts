import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSchoolDto {
  @ApiProperty({ example: 'Lincoln High School' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'LHS001' })
  @IsString()
  code: string;

  @ApiProperty({ example: '123 Main St', required: false })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ example: 'Springfield', required: false })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({ example: 'IL', required: false })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiProperty({ example: 'USA', required: false })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiProperty({ example: '62701', required: false })
  @IsOptional()
  @IsString()
  postalCode?: string;
}

