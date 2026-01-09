import { Module } from '@nestjs/common';
import { RazorpayService } from './razorpay.service';
import { RazorpayController } from './razorpay.controller';
import { WebhookController } from './webhook.controller';
import { PrismaModule } from '../database/prisma.module';
import { ConfigModule } from '../config/config.module';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [RazorpayController, WebhookController],
  providers: [RazorpayService],
  exports: [RazorpayService],
})
export class RazorpayModule {}

