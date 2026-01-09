import { IsString, IsUUID, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateNotificationDto {
  @ApiProperty({ example: 'user-uuid' })
  @IsUUID()
  userId: string;

  @ApiProperty({ example: 'New Message' })
  @IsString()
  title: string;

  @ApiProperty({ example: 'You have a new message' })
  @IsString()
  message: string;

  @ApiProperty({ example: 'info', required: false })
  @IsOptional()
  @IsString()
  type?: string;
}

