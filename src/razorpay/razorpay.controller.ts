import { Controller, Post, Body, Headers, Request, UseGuards, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { RazorpayService } from './razorpay.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { RequestWithRole } from '../common/interfaces/request-with-role.interface';

@ApiTags('razorpay')
@Controller('razorpay')
export class RazorpayController {
  constructor(private readonly razorpayService: RazorpayService) {}

  @Post('orders')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SchoolAdmin', 'PlatformAdmin', 'Parent', 'Teacher')
  @RequirePermissions('payments:create')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create a Razorpay order (School subscriptions, kits, or programs)' })
  @ApiResponse({ status: 201, description: 'Order created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request or students cannot make payments' })
  @ApiResponse({ status: 404, description: 'School or user not found' })
  async createOrder(@Body() createOrderDto: CreateOrderDto, @Request() req: RequestWithRole) {
    return this.razorpayService.createOrder(createOrderDto, req.user.id);
  }

  @Get('orders/:razorpayOrderId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SchoolAdmin', 'PlatformAdmin', 'Parent', 'Teacher')
  @RequirePermissions('payments:read')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get order details by Razorpay order ID' })
  @ApiResponse({ status: 200, description: 'Order details' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async getOrder(@Param('razorpayOrderId') razorpayOrderId: string) {
    return this.razorpayService.getOrderByRazorpayId(razorpayOrderId);
  }
}

