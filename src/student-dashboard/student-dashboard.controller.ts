import { Controller, Get, Param, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { StudentDashboardService } from './student-dashboard.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';

@ApiTags('student-dashboard')
@ApiBearerAuth('JWT-auth')
@ApiHeader({ name: 'X-Active-Role', description: 'Active role for this request' })
@Controller('student-dashboard')
@UseGuards(JwtAuthGuard)
export class StudentDashboardController {
  constructor(private readonly dashboardService: StudentDashboardService) {}

  @Get('my-dashboard')
  @Roles('Student')
  @RequirePermissions('dashboard:read')
  @ApiOperation({ summary: 'Get student dashboard data (own data only)' })
  @ApiResponse({
    status: 200,
    description: 'Dashboard data retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        skillSnapshot: {
          type: 'object',
          properties: {
            totalSkills: { type: 'number' },
            averageLevel: { type: 'number' },
            averageProgress: { type: 'number' },
            categoriesCount: { type: 'number' },
            skillsByCategory: { type: 'object' },
            recentSkills: { type: 'array' },
          },
        },
        activeProjectAssignments: { type: 'array' },
        submittedProjects: { type: 'array' },
        badges: {
          type: 'object',
          properties: {
            totalBadges: { type: 'number' },
            categoriesCount: { type: 'number' },
            badgesByCategory: { type: 'object' },
            recentBadges: { type: 'array' },
          },
        },
        notifications: {
          type: 'object',
          properties: {
            total: { type: 'number' },
            unreadCount: { type: 'number' },
            notifications: { type: 'array' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Forbidden - can only access own data' })
  async getMyDashboard(@Request() req: any) {
    return this.dashboardService.getDashboard(req.user.id, req.user.id);
  }

  @Get(':studentId')
  @Roles('Student')
  @RequirePermissions('dashboard:read')
  @ApiOperation({ summary: 'Get student dashboard data by student ID' })
  @ApiResponse({ status: 200, description: 'Dashboard data retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - can only access own data' })
  async getDashboard(
    @Param('studentId') studentId: string,
    @Request() req: any,
  ) {
    return this.dashboardService.getDashboard(studentId, req.user.id);
  }
}

