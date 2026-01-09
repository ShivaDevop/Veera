import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AcceptConsentDto {
  @ApiProperty({
    example: 'a1b2c3d4e5f6...',
    description: 'Invitation token received from the consent invitation',
  })
  @IsString()
  invitationToken: string;

  @ApiProperty({
    example: 'I approve my child to use the platform',
    required: false,
    description: 'Optional notes or confirmation message',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

