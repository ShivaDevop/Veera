import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService) {}

  async create(createPaymentDto: CreatePaymentDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: createPaymentDto.userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${createPaymentDto.userId} not found`);
    }

    if (createPaymentDto.transactionId) {
      const existingPayment = await this.prisma.payment.findUnique({
        where: { transactionId: createPaymentDto.transactionId },
      });

      if (existingPayment) {
        throw new ConflictException('Payment with this transaction ID already exists');
      }
    }

    return this.prisma.payment.create({
      data: createPaymentDto,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  async findAll(userId?: string, status?: string) {
    const where: any = {};
    if (userId) {
      where.userId = userId;
    }
    if (status) {
      where.status = status;
    }

    return this.prisma.payment.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException(`Payment with ID ${id} not found`);
    }

    return payment;
  }

  async update(id: string, updatePaymentDto: UpdatePaymentDto) {
    await this.findOne(id);

    if (updatePaymentDto.transactionId) {
      const existingPayment = await this.prisma.payment.findUnique({
        where: { transactionId: updatePaymentDto.transactionId },
      });
      if (existingPayment && existingPayment.id !== id) {
        throw new ConflictException('Payment with this transaction ID already exists');
      }
    }

    return this.prisma.payment.update({
      where: { id },
      data: updatePaymentDto,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.payment.delete({
      where: { id },
    });
  }
}

