import { Controller, Get, Param, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SkillWalletService } from './skill-wallet.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesEnum } from '../common/enums/roles.enum';
import { RolesGuard } from '../common/guards/roles.guard';
import { RequestWithRole } from '../common/interfaces/request-with-role.interface';

@ApiTags('skill-wallet')
@Controller('skill-wallet')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class SkillWalletController {
  constructor(private readonly skillWalletService: SkillWalletService) {}

  @Get('my-wallet')
  @Roles(RolesEnum.Student)
  @ApiOperation({ summary: 'Get my skill wallet (Student only)' })
  @ApiResponse({
    status: 200,
    description: 'Skill wallet retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        studentId: { type: 'string' },
        totalSkills: { type: 'number' },
        skills: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              skill: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  category: { type: 'string' },
                  description: { type: 'string' },
                },
              },
              level: { type: 'number' },
              progress: { type: 'number' },
              project: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  status: { type: 'string' },
                },
              },
              submission: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  status: { type: 'string' },
                  grade: { type: 'number', nullable: true },
                  submittedAt: { type: 'string' },
                },
              },
              endorsedBy: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  email: { type: 'string' },
                  firstName: { type: 'string', nullable: true },
                  lastName: { type: 'string', nullable: true },
                },
              },
              endorsementDate: { type: 'string' },
              lastUpdated: { type: 'string' },
              createdAt: { type: 'string' },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Forbidden - Only students can access' })
  async getMyWallet(@Request() req: RequestWithRole) {
    return this.skillWalletService.getMyWallet(req.user.id, req.activeRole);
  }

  @Get('student/:studentId')
  @Roles(RolesEnum.Student, RolesEnum.Parent, RolesEnum.Teacher, RolesEnum.SchoolAdmin)
  @ApiOperation({
    summary: 'Get a student\'s skill wallet (Student can view own, Parent can view child\'s, Teachers/Admins can view any)',
  })
  @ApiResponse({
    status: 200,
    description: 'Student skill wallet retrieved successfully',
  })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Student not found' })
  async getStudentWallet(
    @Param('studentId') studentId: string,
    @Request() req: RequestWithRole,
  ) {
    return this.skillWalletService.getStudentWallet(
      req.user.id,
      req.activeRole,
      studentId,
    );
  }
}
