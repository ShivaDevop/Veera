import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { randomBytes } from 'crypto';
import { InviteParentDto } from './dto/invite-parent.dto';
import { AcceptConsentDto } from './dto/accept-consent.dto';
import { ConsentStatusDto } from './dto/consent-status.dto';
import { TwilioNotificationService } from '../twilio/twilio-notification.service';

@Injectable()
export class ConsentService {
  private readonly logger = new Logger(ConsentService.name);
  private readonly CONSENT_AGE_THRESHOLD = 13;
  private readonly INVITATION_EXPIRY_DAYS = 30;

  constructor(
    private prisma: PrismaService,
    private twilioNotificationService?: TwilioNotificationService,
  ) {}

  calculateAge(dateOfBirth: Date): number {
    const today = new Date();
    let age = today.getFullYear() - dateOfBirth.getFullYear();
    const monthDiff = today.getMonth() - dateOfBirth.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
      age--;
    }

    return age;
  }

  async requiresParentConsent(studentId: string): Promise<boolean> {
    const student = await this.prisma.user.findUnique({
      where: { id: studentId },
    });

    if (!student) {
      throw new NotFoundException(`Student with ID ${studentId} not found`);
    }

    if (!student.dateOfBirth) {
      throw new BadRequestException('Student date of birth is required');
    }

    const age = this.calculateAge(student.dateOfBirth);
    return age < this.CONSENT_AGE_THRESHOLD;
  }

  async inviteParent(
    studentId: string,
    inviteParentDto: InviteParentDto,
    requestedBy: string,
  ) {
    const student = await this.prisma.user.findUnique({
      where: { id: studentId },
      include: { parent: true },
    });

    if (!student) {
      throw new NotFoundException(`Student with ID ${studentId} not found`);
    }

    if (!student.dateOfBirth) {
      throw new BadRequestException('Student date of birth is required');
    }

    const age = this.calculateAge(student.dateOfBirth);
    if (age >= this.CONSENT_AGE_THRESHOLD) {
      throw new BadRequestException(
        `Student is ${age} years old and does not require parent consent`,
      );
    }

    const parent = await this.prisma.user.findUnique({
      where: { email: inviteParentDto.parentEmail },
      include: { parent: true },
    });

    if (!parent) {
      throw new NotFoundException(`Parent with email ${inviteParentDto.parentEmail} not found`);
    }

    if (!parent.parent) {
      throw new BadRequestException('User is not registered as a parent');
    }

    const existingConsent = await this.prisma.parentConsent.findUnique({
      where: {
        studentId_parentId: {
          studentId,
          parentId: parent.id,
        },
      },
    });

    if (existingConsent && existingConsent.status === 'approved') {
      throw new ConflictException('Parent consent already approved');
    }

    const invitationToken = this.generateInvitationToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.INVITATION_EXPIRY_DAYS);

    const consent = await this.prisma.parentConsent.upsert({
      where: {
        studentId_parentId: {
          studentId,
          parentId: parent.id,
        },
      },
      update: {
        invitationToken,
        expiresAt,
        status: 'pending',
        consentGiven: false,
        consentDate: null,
        revokedDate: null,
        invitedAt: new Date(),
        notes: inviteParentDto.notes,
      },
      create: {
        studentId,
        parentId: parent.id,
        invitationToken,
        expiresAt,
        status: 'pending',
        notes: inviteParentDto.notes,
      },
    });

    await this.logConsentAction(
      studentId,
      'consent_invited',
      {
        parentId: parent.id,
        parentEmail: parent.email,
        invitationToken: consent.invitationToken,
        requestedBy,
      },
      requestedBy,
    );

    // Send Twilio notification
    if (this.twilioNotificationService) {
      try {
        const studentName = `${student.firstName || ''} ${student.lastName || ''}`.trim() || student.email;
        await this.twilioNotificationService.sendParentConsentRequest(
          parent.id,
          studentName,
          consent.invitationToken,
        );
      } catch (error: any) {
        // Don't fail the request if notification fails
      }
    }

    return {
      consentId: consent.id,
      invitationToken: consent.invitationToken,
      expiresAt: consent.expiresAt,
      message: 'Parent invitation sent successfully',
    };
  }

  async acceptConsent(
    acceptConsentDto: AcceptConsentDto,
    parentUserId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const consent = await this.prisma.parentConsent.findUnique({
      where: { invitationToken: acceptConsentDto.invitationToken },
      include: {
        student: true,
        parent: true,
      },
    });

    if (!consent) {
      throw new NotFoundException('Invalid invitation token');
    }

    if (consent.parentId !== parentUserId) {
      throw new ForbiddenException('You are not authorized to accept this consent');
    }

    if (consent.expiresAt < new Date()) {
      throw new BadRequestException('Invitation token has expired');
    }

    if (consent.status === 'approved' && consent.consentGiven) {
      throw new ConflictException('Consent has already been approved');
    }

    if (consent.status === 'revoked') {
      throw new BadRequestException('Consent has been revoked and cannot be approved');
    }

    const updatedConsent = await this.prisma.parentConsent.update({
      where: { id: consent.id },
      data: {
        status: 'approved',
        consentGiven: true,
        consentDate: new Date(),
        revokedDate: null,
        notes: acceptConsentDto.notes || consent.notes,
      },
      include: {
        student: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            dateOfBirth: true,
          },
        },
        parent: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    await this.logConsentAction(
      consent.studentId,
      'consent_approved',
      {
        consentId: consent.id,
        parentId: consent.parentId,
        consentDate: updatedConsent.consentDate,
        ipAddress,
        userAgent,
      },
      parentUserId,
      ipAddress,
      userAgent,
    );

    const age = await this.calculateAge(updatedConsent.student.dateOfBirth);
    if (age < this.CONSENT_AGE_THRESHOLD) {
      await this.prisma.user.update({
        where: { id: consent.studentId },
        data: { isActive: true },
      });
    }

    return {
      consentId: updatedConsent.id,
      status: updatedConsent.status,
      consentDate: updatedConsent.consentDate,
      student: updatedConsent.student,
      message: 'Consent approved successfully',
    };
  }

  async revokeConsent(
    consentId: string,
    parentUserId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const consent = await this.prisma.parentConsent.findUnique({
      where: { id: consentId },
      include: {
        student: true,
      },
    });

    if (!consent) {
      throw new NotFoundException('Consent not found');
    }

    if (consent.parentId !== parentUserId) {
      throw new ForbiddenException('You are not authorized to revoke this consent');
    }

    if (consent.status === 'revoked') {
      throw new ConflictException('Consent has already been revoked');
    }

    const updatedConsent = await this.prisma.parentConsent.update({
      where: { id: consentId },
      data: {
        status: 'revoked',
        consentGiven: false,
        revokedDate: new Date(),
      },
    });

    await this.logConsentAction(
      consent.studentId,
      'consent_revoked',
      {
        consentId,
        parentId: consent.parentId,
        revokedDate: updatedConsent.revokedDate,
        ipAddress,
        userAgent,
      },
      parentUserId,
      ipAddress,
      userAgent,
    );

    const age = await this.calculateAge(consent.student.dateOfBirth);
    if (age < this.CONSENT_AGE_THRESHOLD) {
      await this.prisma.user.update({
        where: { id: consent.studentId },
        data: { isActive: false },
      });
    }

    return {
      consentId: updatedConsent.id,
      status: updatedConsent.status,
      revokedDate: updatedConsent.revokedDate,
      message: 'Consent revoked successfully',
    };
  }

  async getConsentStatus(studentId: string): Promise<ConsentStatusDto> {
    const student = await this.prisma.user.findUnique({
      where: { id: studentId },
      include: {
        parentConsentsAsStudent: {
          include: {
            parent: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!student) {
      throw new NotFoundException(`Student with ID ${studentId} not found`);
    }

    const requiresConsent = student.dateOfBirth
      ? await this.calculateAge(student.dateOfBirth) < this.CONSENT_AGE_THRESHOLD
      : false;

    const approvedConsents = student.parentConsentsAsStudent.filter(
      (c) => c.status === 'approved' && c.consentGiven,
    );

    const hasValidConsent = approvedConsents.length > 0;
    const canActivate = !requiresConsent || hasValidConsent;

    return {
      studentId: student.id,
      studentEmail: student.email,
      studentName: `${student.firstName || ''} ${student.lastName || ''}`.trim(),
      dateOfBirth: student.dateOfBirth,
      age: student.dateOfBirth ? await this.calculateAge(student.dateOfBirth) : null,
      requiresConsent,
      canActivate,
      isActive: student.isActive,
      consents: student.parentConsentsAsStudent.map((c) => ({
        consentId: c.id,
        parentId: c.parentId,
        parentEmail: c.parent.email,
        parentName: `${c.parent.firstName || ''} ${c.parent.lastName || ''}`.trim(),
        status: c.status,
        consentGiven: c.consentGiven,
        consentDate: c.consentDate,
        revokedDate: c.revokedDate,
        invitedAt: c.invitedAt,
        expiresAt: c.expiresAt,
        notes: c.notes,
      })),
    };
  }

  async getParentConsents(parentId: string) {
    const parent = await this.prisma.user.findUnique({
      where: { id: parentId },
      include: {
        parentConsentsAsParent: {
          include: {
            student: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                dateOfBirth: true,
                isActive: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!parent) {
      throw new NotFoundException(`Parent with ID ${parentId} not found`);
    }

    return parent.parentConsentsAsParent.map((c) => ({
      consentId: c.id,
      studentId: c.studentId,
      studentEmail: c.student.email,
      studentName: `${c.student.firstName || ''} ${c.student.lastName || ''}`.trim(),
      status: c.status,
      consentGiven: c.consentGiven,
      consentDate: c.consentDate,
      revokedDate: c.revokedDate,
      invitationToken: c.invitationToken,
      invitedAt: c.invitedAt,
      expiresAt: c.expiresAt,
      notes: c.notes,
    }));
  }

  private generateInvitationToken(): string {
    return randomBytes(32).toString('hex');
  }

  private async logConsentAction(
    studentId: string,
    action: string,
    changes: any,
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        userId,
        action,
        entity: 'ParentConsent',
        entityId: studentId,
        changes,
        ipAddress,
        userAgent,
      },
    });
  }
}

