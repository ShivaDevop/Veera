import { Controller, Get, Param, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ParentDashboardService } from './parent-dashboard.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RequestWithRole } from '../common/interfaces/request-with-role.interface';

@ApiTags('parent-dashboard')
@ApiBearerAuth('JWT-auth')
@Controller('parent-dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ParentDashboardController {
  constructor(private readonly parentDashboardService: ParentDashboardService) {}

  @Get('my-dashboard')
  @Roles('Parent')
  @ApiOperation({
    summary: 'Get parent dashboard (Parent only)',
    description: 'Returns read-only dashboard with children projects, skill growth, notifications, and consent status',
  })
  @ApiResponse({
    status: 200,
    description: 'Parent dashboard data',
    schema: {
      type: 'object',
      properties: {
        parent: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
          },
        },
        children: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              email: { type: 'string' },
              firstName: { type: 'string' },
              lastName: { type: 'string' },
              dateOfBirth: { type: 'string' },
              isActive: { type: 'boolean' },
              consentDate: { type: 'string' },
            },
          },
        },
        childProjects: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              project: { type: 'object' },
              student: { type: 'object' },
              status: { type: 'string' },
              submittedAt: { type: 'string' },
              grade: { type: 'number', nullable: true },
              feedback: { type: 'string', nullable: true },
            },
          },
        },
        skillGrowth: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              studentId: { type: 'string' },
              student: { type: 'object' },
              totalSkills: { type: 'number' },
              averageLevel: { type: 'number' },
              averageMaturity: { type: 'number' },
              skills: { type: 'array' },
            },
          },
        },
        notifications: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              title: { type: 'string' },
              message: { type: 'string' },
              type: { type: 'string' },
              isRead: { type: 'boolean' },
              createdAt: { type: 'string' },
            },
          },
        },
        consentStatus: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              student: { type: 'object' },
              status: { type: 'string' },
              consentGiven: { type: 'boolean' },
              consentDate: { type: 'string', nullable: true },
              isExpired: { type: 'boolean' },
            },
          },
        },
        summary: {
          type: 'object',
          properties: {
            totalChildren: { type: 'number' },
            totalProjects: { type: 'number' },
            totalSkills: { type: 'number' },
            unreadNotifications: { type: 'number' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Forbidden - User is not a parent' })
  getMyDashboard(@Request() req: RequestWithRole) {
    return this.parentDashboardService.getDashboard(req.user.id);
  }

  @Get('children/:childId')
  @Roles('Parent')
  @ApiOperation({
    summary: 'Get detailed view of a specific child (Parent only)',
    description: 'Returns read-only detailed information about a child including projects and skills',
  })
  @ApiResponse({ status: 200, description: 'Child details' })
  @ApiResponse({ status: 403, description: 'Forbidden - No consent for this child' })
  @ApiResponse({ status: 404, description: 'Child not found' })
  getChildDetails(@Param('childId') childId: string, @Request() req: RequestWithRole) {
    return this.parentDashboardService.getChildDetails(req.user.id, childId);
  }
}

