import { registerAs } from '@nestjs/config';

export const twilioConfig = registerAs('twilio', () => ({
  accountSid: process.env.TWILIO_ACCOUNT_SID || '',
  authToken: process.env.TWILIO_AUTH_TOKEN || '',
  phoneNumber: process.env.TWILIO_PHONE_NUMBER || '',
  whatsappNumber: process.env.TWILIO_WHATSAPP_NUMBER || '',
  enabled: process.env.TWILIO_ENABLED === 'true',
  maxRetries: parseInt(process.env.TWILIO_MAX_RETRIES || '3', 10),
  retryDelayMs: parseInt(process.env.TWILIO_RETRY_DELAY_MS || '5000', 10),
}));

