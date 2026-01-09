import { IsString, IsOptional, IsBoolean, IsEmail } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OnboardSchoolDto {
  @ApiProperty({ description: 'School name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Unique school code' })
  @IsString()
  code: string;

  @ApiPropertyOptional({ description: 'School address' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ description: 'City' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ description: 'State/Province' })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({ description: 'Country' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ description: 'Postal code' })
  @IsOptional()
  @IsString()
  postalCode?: string;

  @ApiPropertyOptional({ description: 'Whether school is active', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ApproveSchoolDto {
  @ApiPropertyOptional({ description: 'Notes about approval' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateSchoolAdminDto {
  @ApiProperty({ description: 'Admin email' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'Admin password' })
  @IsString()
  password: string;

  @ApiPropertyOptional({ description: 'First name' })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({ description: 'Last name' })
  @IsOptional()
  @IsString()
  lastName?: string;
}

