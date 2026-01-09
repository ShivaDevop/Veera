import { IsString, IsOptional, IsArray, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateRoleDto {
  @ApiProperty({ example: 'admin', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ example: 'Administrator role', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: ['users:read', 'users:write'], required: false })
  @IsOptional()
  @IsArray()
  permissions?: string[];

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

