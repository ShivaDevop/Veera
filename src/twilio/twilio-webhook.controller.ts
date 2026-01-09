import { Controller, Post, Body, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiExcludeEndpoint } from '@nestjs/swagger';
import { TwilioNotificationService } from './twilio-notification.service';

@ApiTags('twilio-webhook')
@Controller('twilio/webhook')
export class TwilioWebhookController {
  private readonly logger = new Logger(TwilioWebhookController.name);

  constructor(private readonly twilioNotificationService: TwilioNotificationService) {}

  @Post('status')
  @HttpCode(HttpStatus.OK)
  @ApiExcludeEndpoint()
  @ApiOperation({ summary: 'Twilio status webhook (internal use only)' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  async handleStatusWebhook(@Body() body: any) {
    const { MessageSid, MessageStatus } = body;

    if (!MessageSid || !MessageStatus) {
      this.logger.warn('Invalid webhook payload: missing MessageSid or MessageStatus');
      return { received: true };
    }

    this.logger.log(`Received status update for ${MessageSid}: ${MessageStatus}`);

    try {
      await this.twilioNotificationService.updateNotificationStatus(MessageSid, MessageStatus);
    } catch (error: any) {
      this.logger.error(`Error processing status webhook: ${error.message}`, error.stack);
    }

    return { received: true };
  }
}

