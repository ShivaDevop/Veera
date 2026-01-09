import { IsString, IsUUID, IsOptional, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAuditLogDto {
  @ApiProperty({ example: 'user-uuid', required: false })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiProperty({ example: 'create' })
  @IsString()
  action: string;

  @ApiProperty({ example: 'User' })
  @IsString()
  entity: string;

  @ApiProperty({ example: 'entity-uuid', required: false })
  @IsOptional()
  @IsString()
  entityId?: string;

  @ApiProperty({ example: { field: 'value' }, required: false })
  @IsOptional()
  @IsObject()
  changes?: Record<string, any>;

  @ApiProperty({ example: '192.168.1.1', required: false })
  @IsOptional()
  @IsString()
  ipAddress?: string;

  @ApiProperty({ example: 'Mozilla/5.0...', required: false })
  @IsOptional()
  @IsString()
  userAgent?: string;
}

