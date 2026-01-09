import { IsString, IsNumber, IsEnum, IsOptional, IsPositive, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum OrderType {
  SUBSCRIPTION = 'subscription',
  KIT = 'kit',
  PROGRAM = 'program',
}

export class CreateOrderDto {
  @ApiProperty({ description: 'Order type', enum: OrderType })
  @IsEnum(OrderType)
  orderType: OrderType;

  @ApiProperty({ description: 'Amount in paise (INR)', example: 100000 })
  @IsNumber()
  @IsPositive()
  @Min(1)
  amount: number;

  @ApiPropertyOptional({ description: 'Currency code', default: 'INR' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ description: 'School ID (required for subscriptions)' })
  @IsOptional()
  @IsString()
  schoolId?: string;

  @ApiPropertyOptional({ description: 'User ID (required for kit/program payments, must not be a student)' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ description: 'Order description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Plan type for subscriptions (monthly, quarterly, yearly)' })
  @IsOptional()
  @IsString()
  planType?: string;

  @ApiPropertyOptional({ description: 'Plan name' })
  @IsOptional()
  @IsString()
  planName?: string;

  @ApiPropertyOptional({ description: 'Razorpay plan ID (for subscriptions)' })
  @IsOptional()
  @IsString()
  razorpayPlanId?: string;
}

