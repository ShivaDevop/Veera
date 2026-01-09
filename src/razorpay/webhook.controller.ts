import {
  Controller,
  Post,
  Body,
  Headers,
  Req,
  HttpCode,
  HttpStatus,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiExcludeEndpoint } from '@nestjs/swagger';
import { RazorpayService } from './razorpay.service';
import { PrismaService } from '../database/prisma.service';
import { Request } from 'express';

@ApiTags('razorpay-webhook')
@Controller('razorpay/webhook')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(
    private readonly razorpayService: RazorpayService,
    private readonly prisma: PrismaService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiExcludeEndpoint()
  @ApiOperation({ summary: 'Razorpay webhook endpoint (internal use only)' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  async handleWebhook(
    @Req() req: Request & { rawBody?: Buffer },
    @Headers('x-razorpay-signature') signature: string,
    @Body() body: any,
  ) {
    if (!signature) {
      this.logger.error('Webhook signature missing');
      throw new BadRequestException('Webhook signature is required');
    }

    // Get raw body for signature verification
    const webhookBody = req.rawBody?.toString() || JSON.stringify(body);
    
    // Verify webhook signature
    const isValid = this.razorpayService.verifyWebhookSignature(webhookBody, signature);
    
    if (!isValid) {
      this.logger.error('Invalid webhook signature');
      throw new BadRequestException('Invalid webhook signature');
    }

    const event = body;
    this.logger.log(`Received webhook event: ${event.event}`);

    try {
      switch (event.event) {
        case 'order.paid':
          await this.handleOrderPaid(event);
          break;
        case 'payment.captured':
          await this.handlePaymentCaptured(event);
          break;
        case 'payment.failed':
          await this.handlePaymentFailed(event);
          break;
        case 'subscription.activated':
          await this.handleSubscriptionActivated(event);
          break;
        case 'subscription.cancelled':
          await this.handleSubscriptionCancelled(event);
          break;
        case 'subscription.charged':
          await this.handleSubscriptionCharged(event);
          break;
        case 'subscription.pending':
          await this.handleSubscriptionPending(event);
          break;
        default:
          this.logger.warn(`Unhandled webhook event: ${event.event}`);
      }

      return { received: true };
    } catch (error: any) {
      this.logger.error(`Error processing webhook: ${error.message}`, error.stack);
      throw new BadRequestException(`Error processing webhook: ${error.message}`);
    }
  }

  private async handleOrderPaid(event: any) {
    const payload = event.payload;
    const orderEntity = payload.order.entity;
    const paymentEntity = payload.payment.entity;

    this.logger.log(`Order paid: ${orderEntity.id}`);

    // Update order status
    await this.razorpayService.updateOrderStatus(
      orderEntity.id,
      'paid',
      paymentEntity.id,
      event.payload.payment.entity.notes?.signature,
    );

    // Create payment record
    await this.razorpayService.createPaymentRecord(
      (await this.razorpayService.getOrderByRazorpayId(orderEntity.id)).id,
      paymentEntity.id,
      paymentEntity.amount / 100, // Convert from paise to rupees
      paymentEntity.currency,
      'completed',
      {
        razorpayPayment: paymentEntity,
        webhookEvent: event.event,
        receivedAt: new Date(),
      },
    );
  }

  private async handlePaymentCaptured(event: any) {
    const paymentEntity = event.payload.payment.entity;
    this.logger.log(`Payment captured: ${paymentEntity.id}`);

    // Find order by payment
    const order = await this.prisma.order.findFirst({
      where: {
        razorpayPaymentId: paymentEntity.id,
      },
    });

    if (order) {
      await this.razorpayService.updateOrderStatus(order.razorpayOrderId, 'paid', paymentEntity.id);
    }
  }

  private async handlePaymentFailed(event: any) {
    const paymentEntity = event.payload.payment.entity;
    this.logger.log(`Payment failed: ${paymentEntity.id}`);

    // Find order by payment
    const order = await this.prisma.order.findFirst({
      where: {
        razorpayPaymentId: paymentEntity.id,
      },
    });

    if (order) {
      await this.razorpayService.updateOrderStatus(order.razorpayOrderId, 'failed');
    }
  }

  private async handleSubscriptionActivated(event: any) {
    const subscriptionEntity = event.payload.subscription.entity;
    this.logger.log(`Subscription activated: ${subscriptionEntity.id}`);

    await this.razorpayService.updateSubscriptionStatus(
      subscriptionEntity.id,
      'active',
      subscriptionEntity.current_end ? new Date(subscriptionEntity.current_end * 1000) : undefined,
    );
  }

  private async handleSubscriptionCancelled(event: any) {
    const subscriptionEntity = event.payload.subscription.entity;
    this.logger.log(`Subscription cancelled: ${subscriptionEntity.id}`);

    await this.razorpayService.updateSubscriptionStatus(
      subscriptionEntity.id,
      'cancelled',
      undefined,
      new Date(),
      'Cancelled via Razorpay webhook',
    );
  }

  private async handleSubscriptionCharged(event: any) {
    const subscriptionEntity = event.payload.subscription.entity;
    const paymentEntity = event.payload.payment.entity;
    this.logger.log(`Subscription charged: ${subscriptionEntity.id}`);

    // Update subscription next billing date
    if (subscriptionEntity.current_end) {
      await this.razorpayService.updateSubscriptionStatus(
        subscriptionEntity.id,
        'active',
        new Date(subscriptionEntity.current_end * 1000),
      );
    }

    // Create payment record if order exists
    const subscription = await this.prisma.subscription.findUnique({
      where: { razorpaySubscriptionId: subscriptionEntity.id },
      include: { order: true },
    });

    if (subscription && subscription.order) {
      await this.razorpayService.createPaymentRecord(
        subscription.order.id,
        paymentEntity.id,
        paymentEntity.amount / 100,
        paymentEntity.currency,
        'completed',
        {
          razorpayPayment: paymentEntity,
          subscriptionId: subscriptionEntity.id,
          webhookEvent: event.event,
          receivedAt: new Date(),
        },
      );
    }
  }

  private async handleSubscriptionPending(event: any) {
    const subscriptionEntity = event.payload.subscription.entity;
    this.logger.log(`Subscription pending: ${subscriptionEntity.id}`);

    await this.razorpayService.updateSubscriptionStatus(
      subscriptionEntity.id,
      'past_due',
    );
  }
}

