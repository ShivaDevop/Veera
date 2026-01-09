import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import Razorpay from 'razorpay';
import * as crypto from 'crypto';
import { CreateOrderDto } from './dto/create-order.dto';

@Injectable()
export class RazorpayService {
  private readonly logger = new Logger(RazorpayService.name);
  private razorpayInstance: Razorpay;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    const keyId = this.configService.get<string>('razorpay.keyId');
    const keySecret = this.configService.get<string>('razorpay.keySecret');
    const enabled = this.configService.get<boolean>('razorpay.enabled');

    if (enabled && keyId && keySecret) {
      this.razorpayInstance = new Razorpay({
        key_id: keyId,
        key_secret: keySecret,
      });
      this.logger.log('Razorpay initialized successfully');
    } else {
      this.logger.warn('Razorpay is not enabled or credentials are missing');
    }
  }

  /**
   * Verify Razorpay webhook signature
   */
  verifyWebhookSignature(webhookBody: string, signature: string): boolean {
    const webhookSecret = this.configService.get<string>('razorpay.webhookSecret');
    if (!webhookSecret) {
      this.logger.error('Webhook secret not configured');
      return false;
    }

    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(webhookBody)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature),
    );
  }

  /**
   * Create a Razorpay order
   */
  async createRazorpayOrder(amount: number, currency: string, receipt?: string, notes?: any) {
    if (!this.razorpayInstance) {
      throw new BadRequestException('Razorpay is not configured');
    }

    try {
      const options = {
        amount: amount, // Amount in paise
        currency: currency || 'INR',
        receipt: receipt || `receipt_${Date.now()}`,
        notes: notes || {},
      };

      const order = await this.razorpayInstance.orders.create(options);
      return order;
    } catch (error: any) {
      this.logger.error(`Failed to create Razorpay order: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to create Razorpay order: ${error.message}`);
    }
  }

  /**
   * Create order in database and Razorpay
   */
  async createOrder(createOrderDto: CreateOrderDto, userId?: string) {
    // Validate order type requirements
    if (createOrderDto.orderType === 'subscription' && !createOrderDto.schoolId) {
      throw new BadRequestException('School ID is required for subscription orders');
    }

    if ((createOrderDto.orderType === 'kit' || createOrderDto.orderType === 'program') && !createOrderDto.userId && !userId) {
      throw new BadRequestException('User ID is required for kit/program orders');
    }

    // Prevent student payments
    if (createOrderDto.userId || userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: createOrderDto.userId || userId },
        include: {
          roles: {
            include: {
              role: true,
            },
          },
        },
      });

      if (user) {
        const isStudent = user.roles.some((ur) => ur.role.name === 'Student');
        if (isStudent) {
          throw new BadRequestException('Students cannot make payments');
        }
      }
    }

    // Validate school exists if provided
    if (createOrderDto.schoolId) {
      const school = await this.prisma.school.findUnique({
        where: { id: createOrderDto.schoolId },
      });

      if (!school) {
        throw new NotFoundException(`School with ID ${createOrderDto.schoolId} not found`);
      }
    }

    // Create Razorpay order
    const receipt = `order_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const notes = {
      orderType: createOrderDto.orderType,
      schoolId: createOrderDto.schoolId,
      userId: createOrderDto.userId || userId,
      planType: createOrderDto.planType,
      planName: createOrderDto.planName,
    };

    const razorpayOrder = await this.createRazorpayOrder(
      createOrderDto.amount,
      createOrderDto.currency || 'INR',
      receipt,
      notes,
    );

    // Create order in database
    const order = await this.prisma.order.create({
      data: {
        razorpayOrderId: razorpayOrder.id,
        schoolId: createOrderDto.schoolId,
        userId: createOrderDto.userId || userId,
        orderType: createOrderDto.orderType,
        amount: createOrderDto.amount / 100, // Convert from paise to rupees
        currency: createOrderDto.currency || 'INR',
        status: 'created',
        description: createOrderDto.description,
        notes: createOrderDto.notes,
        metadata: {
          razorpayOrder: razorpayOrder,
          planType: createOrderDto.planType,
          planName: createOrderDto.planName,
          razorpayPlanId: createOrderDto.razorpayPlanId,
        },
      },
    });

    // If subscription, create subscription record
    if (createOrderDto.orderType === 'subscription' && createOrderDto.schoolId) {
      const startDate = new Date();
      let endDate: Date | null = null;

      // Calculate end date based on plan type
      if (createOrderDto.planType === 'monthly') {
        endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + 1);
      } else if (createOrderDto.planType === 'quarterly') {
        endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + 3);
      } else if (createOrderDto.planType === 'yearly') {
        endDate = new Date(startDate);
        endDate.setFullYear(endDate.getFullYear() + 1);
      }

      await this.prisma.subscription.create({
        data: {
          schoolId: createOrderDto.schoolId,
          orderId: order.id,
          razorpayPlanId: createOrderDto.razorpayPlanId,
          planName: createOrderDto.planName || 'Default Plan',
          planType: createOrderDto.planType || 'monthly',
          amount: createOrderDto.amount / 100,
          currency: createOrderDto.currency || 'INR',
          status: 'active',
          startDate,
          endDate,
          nextBillingDate: endDate,
        },
      });
    }

    this.logger.log(`Order ${order.id} created with Razorpay order ${razorpayOrder.id}`);

    return {
      order,
      razorpayOrder,
    };
  }

  /**
   * Get order by Razorpay order ID
   */
  async getOrderByRazorpayId(razorpayOrderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { razorpayOrderId },
      include: {
        school: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        subscription: true,
        payments: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Order with Razorpay ID ${razorpayOrderId} not found`);
    }

    return order;
  }

  /**
   * Update order status
   */
  async updateOrderStatus(
    razorpayOrderId: string,
    status: string,
    razorpayPaymentId?: string,
    razorpaySignature?: string,
  ) {
    const order = await this.getOrderByRazorpayId(razorpayOrderId);

    const updateData: any = {
      status,
      updatedAt: new Date(),
    };

    if (razorpayPaymentId) {
      updateData.razorpayPaymentId = razorpayPaymentId;
    }

    if (razorpaySignature) {
      updateData.razorpaySignature = razorpaySignature;
    }

    if (status === 'paid') {
      updateData.paidAt = new Date();
    }

    const updatedOrder = await this.prisma.order.update({
      where: { id: order.id },
      data: updateData,
      include: {
        subscription: true,
      },
    });

    // If subscription order is paid, ensure subscription is active
    if (status === 'paid' && updatedOrder.orderType === 'subscription' && updatedOrder.subscription) {
      await this.prisma.subscription.update({
        where: { id: updatedOrder.subscription.id },
        data: {
          status: 'active',
        },
      });
    }

    this.logger.log(`Order ${order.id} status updated to ${status}`);

    return updatedOrder;
  }

  /**
   * Create payment record
   */
  async createPaymentRecord(
    orderId: string,
    razorpayPaymentId: string,
    amount: number,
    currency: string,
    status: string,
    metadata?: any,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }

    const payment = await this.prisma.payment.create({
      data: {
        userId: order.userId || '',
        orderId: order.id,
        amount,
        currency,
        status,
        transactionId: razorpayPaymentId,
        paymentMethod: 'razorpay',
        metadata: {
          ...metadata,
          razorpayPaymentId,
          orderId: order.id,
        },
      },
    });

    return payment;
  }

  /**
   * Update subscription status
   */
  async updateSubscriptionStatus(
    razorpaySubscriptionId: string,
    status: string,
    nextBillingDate?: Date,
    cancelledAt?: Date,
    cancellationReason?: string,
  ) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { razorpaySubscriptionId },
    });

    if (!subscription) {
      throw new NotFoundException(`Subscription with Razorpay ID ${razorpaySubscriptionId} not found`);
    }

    const updateData: any = {
      status,
      updatedAt: new Date(),
    };

    if (nextBillingDate) {
      updateData.nextBillingDate = nextBillingDate;
    }

    if (cancelledAt) {
      updateData.cancelledAt = cancelledAt;
    }

    if (cancellationReason) {
      updateData.cancellationReason = cancellationReason;
    }

    return this.prisma.subscription.update({
      where: { id: subscription.id },
      data: updateData,
    });
  }
}

