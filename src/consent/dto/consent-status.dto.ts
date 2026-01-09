import { ApiProperty } from '@nestjs/swagger';

export class ConsentInfoDto {
  @ApiProperty({ example: 'consent-uuid' })
  consentId: string;

  @ApiProperty({ example: 'parent-uuid' })
  parentId: string;

  @ApiProperty({ example: 'parent@example.com' })
  parentEmail: string;

  @ApiProperty({ example: 'John Doe' })
  parentName: string;

  @ApiProperty({ example: 'approved', enum: ['pending', 'approved', 'revoked'] })
  status: string;

  @ApiProperty({ example: true })
  consentGiven: boolean;

  @ApiProperty({ example: '2024-01-01T00:00:00Z', required: false })
  consentDate?: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00Z', required: false })
  revokedDate?: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00Z' })
  invitedAt: Date;

  @ApiProperty({ example: '2024-02-01T00:00:00Z' })
  expiresAt: Date;

  @ApiProperty({ example: 'Notes about consent', required: false })
  notes?: string;
}

export class ConsentStatusDto {
  @ApiProperty({ example: 'student-uuid' })
  studentId: string;

  @ApiProperty({ example: 'student@example.com' })
  studentEmail: string;

  @ApiProperty({ example: 'Jane Doe' })
  studentName: string;

  @ApiProperty({ example: '2015-01-01T00:00:00Z', required: false })
  dateOfBirth?: Date;

  @ApiProperty({ example: 9, required: false })
  age?: number;

  @ApiProperty({
    example: true,
    description: 'Whether the student requires parent consent (age < 13)',
  })
  requiresConsent: boolean;

  @ApiProperty({
    example: false,
    description: 'Whether the student can activate their account',
  })
  canActivate: boolean;

  @ApiProperty({
    example: false,
    description: 'Current activation status of the student account',
  })
  isActive: boolean;

  @ApiProperty({ type: [ConsentInfoDto] })
  consents: ConsentInfoDto[];
}

