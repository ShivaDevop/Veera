import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SchoolAdminService } from './school-admin.service';
import { Roles } from '../common/decorators/roles.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { RequestWithRole } from '../common/interfaces/request-with-role.interface';
import { CreateTeacherDto, UpdateTeacherDto, TeacherQueryDto } from './dto/teacher-management.dto';
import { ReportQueryDto } from './dto/reports.dto';
import { ClassQueryDto } from './dto/class-oversight.dto';

@ApiTags('school-admin')
@ApiBearerAuth('JWT-auth')
@Controller('school-admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SchoolAdmin')
export class SchoolAdminController {
  constructor(private readonly schoolAdminService: SchoolAdminService) {}

  // ==================== TEACHER MANAGEMENT ====================

  @Post('schools/:schoolId/teachers')
  @RequirePermissions('school-admin:teachers:create')
  @ApiOperation({ summary: 'Create a new teacher for the school (School Admin only)' })
  @ApiResponse({ status: 201, description: 'Teacher created successfully' })
  @ApiResponse({ status: 404, description: 'School not found' })
  @ApiResponse({ status: 409, description: 'User with this email already exists' })
  createTeacher(
    @Param('schoolId') schoolId: string,
    @Body() createTeacherDto: CreateTeacherDto,
    @Request() req: RequestWithRole,
  ) {
    return this.schoolAdminService.createTeacher(schoolId, createTeacherDto, req.user.id);
  }

  @Get('schools/:schoolId/teachers')
  @RequirePermissions('school-admin:teachers:read')
  @ApiOperation({ summary: 'List all teachers for the school (School Admin only)' })
  @ApiResponse({ status: 200, description: 'List of teachers' })
  listTeachers(
    @Param('schoolId') schoolId: string,
    @Query() query: TeacherQueryDto,
    @Request() req: RequestWithRole,
  ) {
    return this.schoolAdminService.listTeachers(schoolId, query, req.user.id);
  }

  @Get('schools/:schoolId/teachers/:teacherId')
  @RequirePermissions('school-admin:teachers:read')
  @ApiOperation({ summary: 'Get teacher details (School Admin only)' })
  @ApiResponse({ status: 200, description: 'Teacher details' })
  @ApiResponse({ status: 404, description: 'Teacher not found' })
  getTeacher(
    @Param('schoolId') schoolId: string,
    @Param('teacherId') teacherId: string,
    @Request() req: RequestWithRole,
  ) {
    return this.schoolAdminService.getTeacher(schoolId, teacherId, req.user.id);
  }

  @Put('schools/:schoolId/teachers/:teacherId')
  @RequirePermissions('school-admin:teachers:update')
  @ApiOperation({ summary: 'Update teacher (School Admin only)' })
  @ApiResponse({ status: 200, description: 'Teacher updated successfully' })
  @ApiResponse({ status: 404, description: 'Teacher not found' })
  updateTeacher(
    @Param('schoolId') schoolId: string,
    @Param('teacherId') teacherId: string,
    @Body() updateTeacherDto: UpdateTeacherDto,
    @Request() req: RequestWithRole,
  ) {
    return this.schoolAdminService.updateTeacher(schoolId, teacherId, updateTeacherDto, req.user.id);
  }

  @Patch('schools/:schoolId/teachers/:teacherId/activate')
  @RequirePermissions('school-admin:teachers:update')
  @ApiOperation({ summary: 'Activate teacher (School Admin only)' })
  @ApiResponse({ status: 200, description: 'Teacher activated successfully' })
  activateTeacher(
    @Param('schoolId') schoolId: string,
    @Param('teacherId') teacherId: string,
    @Request() req: RequestWithRole,
  ) {
    return this.schoolAdminService.activateTeacher(schoolId, teacherId, req.user.id);
  }

  @Patch('schools/:schoolId/teachers/:teacherId/deactivate')
  @RequirePermissions('school-admin:teachers:update')
  @ApiOperation({ summary: 'Deactivate teacher (School Admin only)' })
  @ApiResponse({ status: 200, description: 'Teacher deactivated successfully' })
  deactivateTeacher(
    @Param('schoolId') schoolId: string,
    @Param('teacherId') teacherId: string,
    @Request() req: RequestWithRole,
  ) {
    return this.schoolAdminService.deactivateTeacher(schoolId, teacherId, req.user.id);
  }

  // ==================== CLASS OVERSIGHT ====================

  @Get('schools/:schoolId/classes')
  @RequirePermissions('school-admin:classes:read')
  @ApiOperation({ summary: 'List all classes for the school (School Admin only)' })
  @ApiResponse({ status: 200, description: 'List of classes' })
  listClasses(
    @Param('schoolId') schoolId: string,
    @Query() query: ClassQueryDto,
    @Request() req: RequestWithRole,
  ) {
    return this.schoolAdminService.listClasses(schoolId, query, req.user.id);
  }

  @Get('schools/:schoolId/classes/:classId')
  @RequirePermissions('school-admin:classes:read')
  @ApiOperation({ summary: 'Get class details with students and projects (School Admin only)' })
  @ApiResponse({ status: 200, description: 'Class details' })
  @ApiResponse({ status: 404, description: 'Class not found' })
  getClassDetails(
    @Param('schoolId') schoolId: string,
    @Param('classId') classId: string,
    @Request() req: RequestWithRole,
  ) {
    return this.schoolAdminService.getClassDetails(schoolId, classId, req.user.id);
  }

  // ==================== REPORTS ====================

  @Get('schools/:schoolId/reports')
  @RequirePermissions('school-admin:reports:read')
  @ApiOperation({ summary: 'Generate reports for the school (School Admin only)' })
  @ApiResponse({ status: 200, description: 'Report generated successfully' })
  generateReport(
    @Param('schoolId') schoolId: string,
    @Query() query: ReportQueryDto,
    @Request() req: RequestWithRole,
  ) {
    return this.schoolAdminService.generateReport(schoolId, query, req.user.id);
  }

  // ==================== SUBSCRIPTION STATUS ====================

  @Get('schools/:schoolId/subscription')
  @RequirePermissions('school-admin:subscription:read')
  @ApiOperation({ summary: 'Get subscription status for the school (School Admin only)' })
  @ApiResponse({ status: 200, description: 'Subscription status' })
  @ApiResponse({ status: 404, description: 'School not found' })
  getSubscriptionStatus(
    @Param('schoolId') schoolId: string,
    @Request() req: RequestWithRole,
  ) {
    return this.schoolAdminService.getSubscriptionStatus(schoolId, req.user.id);
  }
}

