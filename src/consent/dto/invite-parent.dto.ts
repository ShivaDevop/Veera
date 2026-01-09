import { IsEmail, IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class InviteParentDto {
  @ApiProperty({
    example: 'parent@example.com',
    description: 'Email address of the parent to invite',
  })
  @IsEmail()
  parentEmail: string;

  @ApiProperty({
    example: 'Please provide consent for your child to use the platform',
    required: false,
    description: 'Optional notes or message for the parent',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

