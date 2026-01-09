import { Module } from '@nestjs/common';
import { TwilioNotificationService } from './twilio-notification.service';
import { TwilioWebhookController } from './twilio-webhook.controller';
import { PrismaModule } from '../database/prisma.module';
import { ConfigModule } from '../config/config.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, ConfigModule, NotificationsModule],
  providers: [TwilioNotificationService],
  controllers: [TwilioWebhookController],
  exports: [TwilioNotificationService],
})
export class TwilioModule {}

