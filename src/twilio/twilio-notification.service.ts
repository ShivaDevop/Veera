import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import twilio from 'twilio';
import { NotificationsService } from '../notifications/notifications.service';

export enum NotificationChannel {
  SMS = 'sms',
  WHATSAPP = 'whatsapp',
}

export enum NotificationTrigger {
  PARENT_CONSENT_REQUEST = 'parent_consent_request',
  PROJECT_APPROVAL = 'project_approval',
  SKILL_EARNED = 'skill_earned',
}

@Injectable()
export class TwilioNotificationService {
  private readonly logger = new Logger(TwilioNotificationService.name);
  private twilioClient: twilio.Twilio | null = null;
  private readonly maxRetries: number;
  private readonly retryDelayMs: number;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {
    const accountSid = this.configService.get<string>('twilio.accountSid');
    const authToken = this.configService.get<string>('twilio.authToken');
    const enabled = this.configService.get<boolean>('twilio.enabled');

    this.maxRetries = this.configService.get<number>('twilio.maxRetries') || 3;
    this.retryDelayMs = this.configService.get<number>('twilio.retryDelayMs') || 5000;

    if (enabled && accountSid && authToken) {
      this.twilioClient = twilio(accountSid, authToken);
      this.logger.log('Twilio initialized successfully');
    } else {
      this.logger.warn('Twilio is not enabled or credentials are missing');
    }
  }

  /**
   * Send SMS notification
   */
  async sendSMS(phoneNumber: string, message: string, notificationId: string): Promise<void> {
    if (!this.twilioClient) {
      throw new BadRequestException('Twilio is not configured');
    }

    const phoneNumberFrom = this.configService.get<string>('twilio.phoneNumber');
    if (!phoneNumberFrom) {
      throw new BadRequestException('Twilio phone number not configured');
    }

    // Validate phone number format
    const normalizedPhone = this.normalizePhoneNumber(phoneNumber);
    if (!normalizedPhone) {
      throw new BadRequestException(`Invalid phone number: ${phoneNumber}`);
    }

    // Create Twilio notification record
    const twilioNotification = await this.prisma.twilioNotification.create({
      data: {
        notificationId,
        channel: NotificationChannel.SMS,
        recipientPhone: normalizedPhone,
        message,
        status: 'pending',
        maxRetries: this.maxRetries,
      },
    });

    try {
      const twilioMessage = await this.twilioClient.messages.create({
        body: message,
        from: phoneNumberFrom,
        to: normalizedPhone,
      });

      // Update with Twilio message ID and status
      await this.prisma.twilioNotification.update({
        where: { id: twilioNotification.id },
        data: {
          twilioMessageId: twilioMessage.sid,
          twilioStatus: twilioMessage.status,
          status: twilioMessage.status === 'queued' || twilioMessage.status === 'sent' ? 'sent' : 'pending',
          sentAt: new Date(),
        },
      });

      this.logger.log(`SMS sent to ${normalizedPhone}: ${twilioMessage.sid}`);
    } catch (error: any) {
      this.logger.error(`Failed to send SMS to ${normalizedPhone}: ${error.message}`, error.stack);

      await this.prisma.twilioNotification.update({
        where: { id: twilioNotification.id },
        data: {
          status: 'failed',
          errorMessage: error.message,
          failedAt: new Date(),
        },
      });

      // Retry if retry count is less than max
      if (twilioNotification.retryCount < this.maxRetries) {
        await this.scheduleRetry(twilioNotification.id);
      }

      throw error;
    }
  }

  /**
   * Send WhatsApp notification
   */
  async sendWhatsApp(phoneNumber: string, message: string, notificationId: string): Promise<void> {
    if (!this.twilioClient) {
      throw new BadRequestException('Twilio is not configured');
    }

    const whatsappNumberFrom = this.configService.get<string>('twilio.whatsappNumber');
    if (!whatsappNumberFrom) {
      throw new BadRequestException('Twilio WhatsApp number not configured');
    }

    // Validate phone number format
    const normalizedPhone = this.normalizePhoneNumber(phoneNumber);
    if (!normalizedPhone) {
      throw new BadRequestException(`Invalid phone number: ${phoneNumber}`);
    }

    // Create Twilio notification record
    const twilioNotification = await this.prisma.twilioNotification.create({
      data: {
        notificationId,
        channel: NotificationChannel.WHATSAPP,
        recipientPhone: normalizedPhone,
        message,
        status: 'pending',
        maxRetries: this.maxRetries,
      },
    });

    try {
      const twilioMessage = await this.twilioClient.messages.create({
        body: message,
        from: `whatsapp:${whatsappNumberFrom}`,
        to: `whatsapp:${normalizedPhone}`,
      });

      // Update with Twilio message ID and status
      await this.prisma.twilioNotification.update({
        where: { id: twilioNotification.id },
        data: {
          twilioMessageId: twilioMessage.sid,
          twilioStatus: twilioMessage.status,
          status: twilioMessage.status === 'queued' || twilioMessage.status === 'sent' ? 'sent' : 'pending',
          sentAt: new Date(),
        },
      });

      this.logger.log(`WhatsApp message sent to ${normalizedPhone}: ${twilioMessage.sid}`);
    } catch (error: any) {
      this.logger.error(`Failed to send WhatsApp to ${normalizedPhone}: ${error.message}`, error.stack);

      await this.prisma.twilioNotification.update({
        where: { id: twilioNotification.id },
        data: {
          status: 'failed',
          errorMessage: error.message,
          failedAt: new Date(),
        },
      });

      // Retry if retry count is less than max
      if (twilioNotification.retryCount < this.maxRetries) {
        await this.scheduleRetry(twilioNotification.id);
      }

      throw error;
    }
  }

  /**
   * Send notification via specified channel(s)
   */
  async sendNotification(
    userId: string,
    phoneNumber: string,
    channels: NotificationChannel[],
    title: string,
    message: string,
    type: string = 'info',
  ): Promise<void> {
    // Create in-app notification first
    const notification = await this.notificationsService.create({
      userId,
      title,
      message,
      type,
    });

    // Send via Twilio channels
    const enabled = this.configService.get<boolean>('twilio.enabled');
    if (!enabled || !this.twilioClient) {
      this.logger.warn('Twilio is not enabled, skipping SMS/WhatsApp notification');
      return;
    }

    const promises: Promise<void>[] = [];

    if (channels.includes(NotificationChannel.SMS)) {
      promises.push(
        this.sendSMS(phoneNumber, message, notification.id).catch((error) => {
          this.logger.error(`Failed to send SMS notification: ${error.message}`);
        }),
      );
    }

    if (channels.includes(NotificationChannel.WHATSAPP)) {
      promises.push(
        this.sendWhatsApp(phoneNumber, message, notification.id).catch((error) => {
          this.logger.error(`Failed to send WhatsApp notification: ${error.message}`);
        }),
      );
    }

    await Promise.allSettled(promises);
  }

  /**
   * Retry failed notification
   */
  private async scheduleRetry(twilioNotificationId: string): Promise<void> {
    const twilioNotification = await this.prisma.twilioNotification.findUnique({
      where: { id: twilioNotificationId },
      include: { notification: true },
    });

    if (!twilioNotification) {
      return;
    }

    // Update retry count and status
    await this.prisma.twilioNotification.update({
      where: { id: twilioNotificationId },
      data: {
        retryCount: twilioNotification.retryCount + 1,
        status: 'retrying',
      },
    });

    // Wait before retry
    await new Promise((resolve) => setTimeout(resolve, this.retryDelayMs));

    // Retry sending
    try {
      if (twilioNotification.channel === NotificationChannel.SMS) {
        await this.sendSMS(
          twilioNotification.recipientPhone,
          twilioNotification.message,
          twilioNotification.notificationId,
        );
      } else if (twilioNotification.channel === NotificationChannel.WHATSAPP) {
        await this.sendWhatsApp(
          twilioNotification.recipientPhone,
          twilioNotification.message,
          twilioNotification.notificationId,
        );
      }
    } catch (error: any) {
      this.logger.error(`Retry failed for notification ${twilioNotificationId}: ${error.message}`);
    }
  }

  /**
   * Retry all failed notifications
   */
  async retryFailedNotifications(): Promise<void> {
    const failedNotifications = await this.prisma.twilioNotification.findMany({
      where: {
        status: 'failed',
        retryCount: { lt: this.maxRetries },
      },
      include: {
        notification: true,
      },
    });

    this.logger.log(`Retrying ${failedNotifications.length} failed notifications`);

    for (const notification of failedNotifications) {
      await this.scheduleRetry(notification.id);
    }
  }

  /**
   * Update notification status from Twilio webhook
   */
  async updateNotificationStatus(twilioMessageId: string, status: string): Promise<void> {
    const twilioNotification = await this.prisma.twilioNotification.findUnique({
      where: { twilioMessageId },
    });

    if (!twilioNotification) {
      this.logger.warn(`Twilio notification not found for message ID: ${twilioMessageId}`);
      return;
    }

    const updateData: any = {
      twilioStatus: status,
      updatedAt: new Date(),
    };

    if (status === 'delivered') {
      updateData.status = 'delivered';
      updateData.deliveredAt = new Date();
    } else if (status === 'failed' || status === 'undelivered') {
      updateData.status = 'failed';
      updateData.failedAt = new Date();
    }

    await this.prisma.twilioNotification.update({
      where: { id: twilioNotification.id },
      data: updateData,
    });
  }

  /**
   * Normalize phone number to E.164 format
   */
  private normalizePhoneNumber(phone: string): string | null {
    if (!phone) {
      return null;
    }

    // Remove all non-digit characters except +
    let normalized = phone.replace(/[^\d+]/g, '');

    // If already starts with +, return as is (assuming it's valid)
    if (normalized.startsWith('+')) {
      if (normalized.length >= 11 && normalized.length <= 15) {
        return normalized;
      }
      return null;
    }

    // If starts with 0, remove it (common in some countries)
    if (normalized.startsWith('0')) {
      normalized = normalized.substring(1);
    }

    // For Indian numbers (10 digits), add +91
    if (normalized.length === 10) {
      return `+91${normalized}`;
    }

    // For other numbers, add + if not present
    if (normalized.length >= 10 && normalized.length <= 15) {
      return `+${normalized}`;
    }

    return null;
  }

  // ==================== TRIGGER METHODS ====================

  /**
   * Send parent consent request notification
   */
  async sendParentConsentRequest(
    parentId: string,
    studentName: string,
    invitationToken: string,
    channels: NotificationChannel[] = [NotificationChannel.SMS, NotificationChannel.WHATSAPP],
  ): Promise<void> {
    const parent = await this.prisma.user.findUnique({
      where: { id: parentId },
      include: {
        parent: true,
      },
    });

    if (!parent || !parent.parent?.phoneNumber) {
      this.logger.warn(`Parent ${parentId} not found or phone number not available`);
      return;
    }

    const message = `Hello ${parent.firstName || 'Parent'}, you have been requested to provide consent for ${studentName} to use VEERA platform. Please use this link to approve: ${invitationToken}`;

    await this.sendNotification(
      parentId,
      parent.parent.phoneNumber,
      channels,
      'Parent Consent Request',
      message,
      NotificationTrigger.PARENT_CONSENT_REQUEST,
    );
  }

  /**
   * Send project approval notification
   */
  async sendProjectApproval(
    studentId: string,
    projectName: string,
    channels: NotificationChannel[] = [NotificationChannel.SMS],
  ): Promise<void> {
    const student = await this.prisma.user.findUnique({
      where: { id: studentId },
    });

    if (!student) {
      this.logger.warn(`Student ${studentId} not found`);
      return;
    }

    // Get parent phone number if available
    const parentConsent = await this.prisma.parentConsent.findFirst({
      where: {
        studentId,
        status: 'approved',
        consentGiven: true,
      },
      include: {
        parent: {
          include: {
            parent: true,
          },
        },
      },
    });

    const phoneNumber = parentConsent?.parent?.parent?.phoneNumber;
    if (!phoneNumber) {
      this.logger.warn(`No phone number available for student ${studentId}`);
      return;
    }

    const message = `Congratulations! Your project "${projectName}" has been approved. Check your dashboard for details.`;

    await this.sendNotification(
      studentId,
      phoneNumber,
      channels,
      'Project Approved',
      message,
      NotificationTrigger.PROJECT_APPROVAL,
    );
  }

  /**
   * Send skill earned notification
   */
  async sendSkillEarned(
    studentId: string,
    skillName: string,
    channels: NotificationChannel[] = [NotificationChannel.SMS],
  ): Promise<void> {
    const student = await this.prisma.user.findUnique({
      where: { id: studentId },
    });

    if (!student) {
      this.logger.warn(`Student ${studentId} not found`);
      return;
    }

    // Get parent phone number if available
    const parentConsent = await this.prisma.parentConsent.findFirst({
      where: {
        studentId,
        status: 'approved',
        consentGiven: true,
      },
      include: {
        parent: {
          include: {
            parent: true,
          },
        },
      },
    });

    const phoneNumber = parentConsent?.parent?.parent?.phoneNumber;
    if (!phoneNumber) {
      this.logger.warn(`No phone number available for student ${studentId}`);
      return;
    }

    const message = `Great news! You've earned a new skill: "${skillName}". Keep up the excellent work!`;

    await this.sendNotification(
      studentId,
      phoneNumber,
      channels,
      'New Skill Earned',
      message,
      NotificationTrigger.SKILL_EARNED,
    );
  }
}

