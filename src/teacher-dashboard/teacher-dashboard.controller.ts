import { Controller, Get, Param, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { TeacherDashboardService } from './teacher-dashboard.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RequestWithRole } from '../common/interfaces/request-with-role.interface';

@ApiTags('teacher-dashboard')
@ApiBearerAuth('JWT-auth')
@Controller('teacher-dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TeacherDashboardController {
  constructor(private readonly teacherDashboardService: TeacherDashboardService) {}

  @Get('my-dashboard')
  @Roles('Teacher')
  @ApiOperation({
    summary: 'Get teacher dashboard (Teacher only)',
    description: 'Returns comprehensive dashboard with classes, students, projects, submissions, and pending reviews',
  })
  @ApiResponse({
    status: 200,
    description: 'Teacher dashboard data',
    schema: {
      type: 'object',
      properties: {
        teacher: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
          },
        },
        classes: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              code: { type: 'string' },
              grade: { type: 'string' },
              academicYear: { type: 'string' },
              school: { type: 'object' },
              studentCount: { type: 'number' },
            },
          },
        },
        studentRoster: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              email: { type: 'string' },
              firstName: { type: 'string' },
              lastName: { type: 'string' },
              stats: {
                type: 'object',
                properties: {
                  totalAssignments: { type: 'number' },
                  totalSubmissions: { type: 'number' },
                  pendingSubmissions: { type: 'number' },
                },
              },
            },
          },
        },
        assignedProjects: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              description: { type: 'string' },
              status: { type: 'string' },
              stats: {
                type: 'object',
                properties: {
                  totalStudents: { type: 'number' },
                  totalSubmissions: { type: 'number' },
                  submitted: { type: 'number' },
                  approved: { type: 'number' },
                  rejected: { type: 'number' },
                  pendingReview: { type: 'number' },
                },
              },
            },
          },
        },
        submissionQueue: {
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
              mediaCount: { type: 'number' },
              isOverdue: { type: 'boolean' },
            },
          },
        },
        pendingReviews: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              project: { type: 'object' },
              student: { type: 'object' },
              status: { type: 'string' },
              submittedAt: { type: 'string' },
              daysSinceSubmission: { type: 'number', nullable: true },
              isOverdue: { type: 'boolean' },
            },
          },
        },
        summary: {
          type: 'object',
          properties: {
            totalClasses: { type: 'number' },
            totalStudents: { type: 'number' },
            totalAssignedProjects: { type: 'number' },
            totalSubmissionsInQueue: { type: 'number' },
            totalPendingReviews: { type: 'number' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Forbidden - User is not a teacher' })
  getMyDashboard(@Request() req: RequestWithRole) {
    return this.teacherDashboardService.getDashboard(req.user.id);
  }

  @Get('classes/:classId')
  @Roles('Teacher')
  @ApiOperation({ summary: 'Get class details with student roster (Teacher only)' })
  @ApiResponse({ status: 200, description: 'Class details' })
  @ApiResponse({ status: 403, description: 'Forbidden - No access to this class' })
  getClassDetails(@Param('classId') classId: string, @Request() req: RequestWithRole) {
    return this.teacherDashboardService.getClassDetails(classId, req.user.id);
  }
}

