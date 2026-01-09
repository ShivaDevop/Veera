import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { Roles } from '../common/decorators/roles.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { RequestWithRole } from '../common/interfaces/request-with-role.interface';
import { CreateUserAdminDto, UpdateUserAdminDto, AssignRolesDto, UserQueryDto } from './dto/manage-user.dto';
import { OnboardSchoolDto, ApproveSchoolDto, CreateSchoolAdminDto } from './dto/school-onboarding.dto';
import { ApproveCurriculumDto, PublishCurriculumDto, ArchiveCurriculumDto } from './dto/curriculum-governance.dto';
import { ModerateContentDto, ContentQueryDto } from './dto/content-moderation.dto';
import { AnalyticsQueryDto } from './dto/analytics.dto';

@ApiTags('admin')
@ApiBearerAuth('JWT-auth')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('PlatformAdmin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ==================== USER MANAGEMENT ====================

  @Post('users')
  @RequirePermissions('admin:users:create')
  @ApiOperation({ summary: 'Create a new user (Platform Admin only)' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({ status: 409, description: 'User with this email already exists' })
  createUser(@Body() createUserDto: CreateUserAdminDto, @Request() req: RequestWithRole) {
    return this.adminService.createUser(createUserDto, req.user.id);
  }

  @Get('users')
  @RequirePermissions('admin:users:read')
  @ApiOperation({ summary: 'List all users with pagination and filters (Platform Admin only)' })
  @ApiResponse({ status: 200, description: 'List of users' })
  listUsers(@Query() query: UserQueryDto) {
    return this.adminService.listUsers(query);
  }

  @Get('users/:id')
  @RequirePermissions('admin:users:read')
  @ApiOperation({ summary: 'Get user details with roles (Platform Admin only)' })
  @ApiResponse({ status: 200, description: 'User details' })
  @ApiResponse({ status: 404, description: 'User not found' })
  getUser(@Param('id') id: string) {
    return this.adminService.getUserWithRoles(id);
  }

  @Put('users/:id')
  @RequirePermissions('admin:users:update')
  @ApiOperation({ summary: 'Update user (Platform Admin only)' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  updateUser(@Param('id') id: string, @Body() updateUserDto: UpdateUserAdminDto, @Request() req: RequestWithRole) {
    return this.adminService.updateUser(id, updateUserDto, req.user.id);
  }

  @Delete('users/:id')
  @RequirePermissions('admin:users:delete')
  @ApiOperation({ summary: 'Delete user (soft delete) (Platform Admin only)' })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  @ApiResponse({ status: 403, description: 'Cannot delete your own account' })
  @ApiResponse({ status: 404, description: 'User not found' })
  deleteUser(@Param('id') id: string, @Request() req: RequestWithRole) {
    return this.adminService.deleteUser(id, req.user.id);
  }

  @Patch('users/:id/roles')
  @RequirePermissions('admin:users:update')
  @ApiOperation({ summary: 'Assign roles to user (Platform Admin only)' })
  @ApiResponse({ status: 200, description: 'Roles assigned successfully' })
  @ApiResponse({ status: 404, description: 'User or roles not found' })
  assignRoles(@Param('id') id: string, @Body() assignRolesDto: AssignRolesDto) {
    return this.adminService.assignRolesToUser(id, assignRolesDto.roles);
  }

  @Patch('users/:id/activate')
  @RequirePermissions('admin:users:update')
  @ApiOperation({ summary: 'Activate user (Platform Admin only)' })
  @ApiResponse({ status: 200, description: 'User activated successfully' })
  activateUser(@Param('id') id: string, @Request() req: RequestWithRole) {
    return this.adminService.activateUser(id, req.user.id);
  }

  @Patch('users/:id/deactivate')
  @RequirePermissions('admin:users:update')
  @ApiOperation({ summary: 'Deactivate user (Platform Admin only)' })
  @ApiResponse({ status: 200, description: 'User deactivated successfully' })
  deactivateUser(@Param('id') id: string, @Request() req: RequestWithRole) {
    return this.adminService.deactivateUser(id, req.user.id);
  }

  // ==================== SCHOOL ONBOARDING ====================

  @Post('schools/onboard')
  @RequirePermissions('admin:schools:create')
  @ApiOperation({ summary: 'Onboard a new school (Platform Admin only)' })
  @ApiResponse({ status: 201, description: 'School onboarded successfully' })
  @ApiResponse({ status: 409, description: 'School with this code already exists' })
  onboardSchool(@Body() onboardDto: OnboardSchoolDto, @Request() req: RequestWithRole) {
    return this.adminService.onboardSchool(onboardDto, req.user.id);
  }

  @Get('schools/onboarding')
  @RequirePermissions('admin:schools:read')
  @ApiOperation({ summary: 'List all schools for onboarding review (Platform Admin only)' })
  @ApiResponse({ status: 200, description: 'List of schools' })
  listSchoolsForOnboarding() {
    return this.adminService.listSchoolsForOnboarding();
  }

  @Post('schools/:id/approve')
  @RequirePermissions('admin:schools:update')
  @ApiOperation({ summary: 'Approve school activation (Platform Admin only)' })
  @ApiResponse({ status: 200, description: 'School approved successfully' })
  @ApiResponse({ status: 404, description: 'School not found' })
  approveSchool(@Param('id') id: string, @Body() approveDto: ApproveSchoolDto, @Request() req: RequestWithRole) {
    return this.adminService.approveSchool(id, approveDto, req.user.id);
  }

  @Post('schools/:id/admin')
  @RequirePermissions('admin:schools:create')
  @ApiOperation({ summary: 'Create school admin for a school (Platform Admin only)' })
  @ApiResponse({ status: 201, description: 'School admin created successfully' })
  @ApiResponse({ status: 404, description: 'School not found' })
  createSchoolAdmin(
    @Param('id') id: string,
    @Body() adminDto: CreateSchoolAdminDto,
    @Request() req: RequestWithRole,
  ) {
    return this.adminService.createSchoolAdmin(id, adminDto, req.user.id);
  }

  // ==================== CURRICULUM GOVERNANCE ====================

  @Get('curricula/governance')
  @RequirePermissions('admin:curriculum:read')
  @ApiOperation({ summary: 'List all curricula for governance (Platform Admin only)' })
  @ApiResponse({ status: 200, description: 'List of curricula' })
  listCurriculaForGovernance() {
    return this.adminService.listCurriculaForGovernance();
  }

  @Post('curricula/:id/approve')
  @RequirePermissions('admin:curriculum:update')
  @ApiOperation({ summary: 'Approve curriculum (Platform Admin only)' })
  @ApiResponse({ status: 200, description: 'Curriculum approved successfully' })
  @ApiResponse({ status: 404, description: 'Curriculum not found' })
  approveCurriculum(@Param('id') id: string, @Body() approveDto: ApproveCurriculumDto, @Request() req: RequestWithRole) {
    return this.adminService.approveCurriculum(id, approveDto, req.user.id);
  }

  @Post('curricula/:id/publish')
  @RequirePermissions('admin:curriculum:update')
  @ApiOperation({ summary: 'Publish curriculum (deactivates other versions) (Platform Admin only)' })
  @ApiResponse({ status: 200, description: 'Curriculum published successfully' })
  @ApiResponse({ status: 404, description: 'Curriculum not found' })
  publishCurriculum(@Param('id') id: string, @Body() publishDto: PublishCurriculumDto, @Request() req: RequestWithRole) {
    return this.adminService.publishCurriculum(id, publishDto, req.user.id);
  }

  @Post('curricula/:id/archive')
  @RequirePermissions('admin:curriculum:update')
  @ApiOperation({ summary: 'Archive curriculum (Platform Admin only)' })
  @ApiResponse({ status: 200, description: 'Curriculum archived successfully' })
  @ApiResponse({ status: 404, description: 'Curriculum not found' })
  archiveCurriculum(@Param('id') id: string, @Body() archiveDto: ArchiveCurriculumDto, @Request() req: RequestWithRole) {
    return this.adminService.archiveCurriculum(id, archiveDto, req.user.id);
  }

  // ==================== CONTENT MODERATION ====================

  @Get('content/moderation')
  @RequirePermissions('admin:content:read')
  @ApiOperation({ summary: 'List content for moderation (Platform Admin only)' })
  @ApiResponse({ status: 200, description: 'List of content for moderation' })
  listContentForModeration(@Query() query: ContentQueryDto) {
    return this.adminService.listContentForModeration(query);
  }

  @Post('projects/:id/moderate')
  @RequirePermissions('admin:content:moderate')
  @ApiOperation({ summary: 'Moderate a project (Platform Admin only)' })
  @ApiResponse({ status: 200, description: 'Project moderated successfully' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  moderateProject(@Param('id') id: string, @Body() moderateDto: ModerateContentDto, @Request() req: RequestWithRole) {
    return this.adminService.moderateProject(id, moderateDto, req.user.id);
  }

  @Post('submissions/:id/moderate')
  @RequirePermissions('admin:content:moderate')
  @ApiOperation({ summary: 'Moderate a submission (Platform Admin only)' })
  @ApiResponse({ status: 200, description: 'Submission moderated successfully' })
  @ApiResponse({ status: 404, description: 'Submission not found' })
  moderateSubmission(
    @Param('id') id: string,
    @Body() moderateDto: ModerateContentDto,
    @Request() req: RequestWithRole,
  ) {
    return this.adminService.moderateSubmission(id, moderateDto, req.user.id);
  }

  // ==================== GLOBAL ANALYTICS ====================

  @Get('dashboard')
  @RequirePermissions('admin:dashboard')
  @ApiOperation({ summary: 'Get dashboard statistics (Platform Admin only)' })
  @ApiResponse({ status: 200, description: 'Dashboard statistics' })
  getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  @Get('analytics/users')
  @RequirePermissions('admin:analytics:read')
  @ApiOperation({ summary: 'Get user analytics (Platform Admin only)' })
  @ApiResponse({ status: 200, description: 'User analytics data' })
  getUserAnalytics(@Query() query: AnalyticsQueryDto) {
    return this.adminService.getUserAnalytics(query);
  }

  @Get('analytics/schools')
  @RequirePermissions('admin:analytics:read')
  @ApiOperation({ summary: 'Get school analytics (Platform Admin only)' })
  @ApiResponse({ status: 200, description: 'School analytics data' })
  getSchoolAnalytics(@Query() query: AnalyticsQueryDto) {
    return this.adminService.getSchoolAnalytics(query);
  }

  @Get('analytics/projects')
  @RequirePermissions('admin:analytics:read')
  @ApiOperation({ summary: 'Get project analytics (Platform Admin only)' })
  @ApiResponse({ status: 200, description: 'Project analytics data' })
  getProjectAnalytics(@Query() query: AnalyticsQueryDto) {
    return this.adminService.getProjectAnalytics(query);
  }

  @Get('activity')
  @RequirePermissions('admin:activity')
  @ApiOperation({ summary: 'Get recent activity (Platform Admin only)' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Recent activity data' })
  getRecentActivity(@Query('limit') limit?: number) {
    return this.adminService.getRecentActivity(limit ? parseInt(limit.toString(), 10) : 50);
  }
}
