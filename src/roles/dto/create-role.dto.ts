import { IsString, IsOptional, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateRoleDto {
  @ApiProperty({ example: 'admin' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'Administrator role', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: ['users:read', 'users:write'], required: false })
  @IsOptional()
  @IsArray()
  permissions?: string[];
}

