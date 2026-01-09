import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AuthService } from '../auth/auth.service';
import { CreateUserAdminDto, UpdateUserAdminDto, AssignRolesDto, UserQueryDto } from './dto/manage-user.dto';
import { OnboardSchoolDto, ApproveSchoolDto, CreateSchoolAdminDto } from './dto/school-onboarding.dto';
import { ApproveCurriculumDto, PublishCurriculumDto, ArchiveCurriculumDto } from './dto/curriculum-governance.dto';
import { ModerateContentDto, ContentQueryDto } from './dto/content-moderation.dto';
import { AnalyticsQueryDto } from './dto/analytics.dto';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private prisma: PrismaService,
    private authService: AuthService,
  ) {}

  // ==================== USER MANAGEMENT ====================

  async createUser(createUserDto: CreateUserAdminDto, adminId: string) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const passwordHash = await this.authService.hashPassword(createUserDto.password);

    const user = await this.prisma.user.create({
      data: {
        email: createUserDto.email,
        passwordHash,
        firstName: createUserDto.firstName,
        lastName: createUserDto.lastName,
        dateOfBirth: createUserDto.dateOfBirth ? new Date(createUserDto.dateOfBirth) : undefined,
        isActive: createUserDto.isActive ?? true,
      },
    });

    // Assign roles if provided
    if (createUserDto.roles && createUserDto.roles.length > 0) {
      await this.assignRolesToUser(user.id, createUserDto.roles);
    }

    return this.getUserWithRoles(user.id);
  }

  async updateUser(userId: string, updateUserDto: UpdateUserAdminDto, adminId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Check email uniqueness if updating email
    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingUser = await this.prisma.user.findUnique({
        where: { email: updateUserDto.email },
      });
      if (existingUser) {
        throw new ConflictException('User with this email already exists');
      }
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        email: updateUserDto.email,
        firstName: updateUserDto.firstName,
        lastName: updateUserDto.lastName,
        dateOfBirth: updateUserDto.dateOfBirth ? new Date(updateUserDto.dateOfBirth) : undefined,
        isActive: updateUserDto.isActive,
      },
    });

    // Update roles if provided
    if (updateUserDto.roles) {
      await this.replaceUserRoles(userId, updateUserDto.roles);
    }

    return this.getUserWithRoles(updatedUser.id);
  }

  async deleteUser(userId: string, adminId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Prevent self-deletion
    if (userId === adminId) {
      throw new ForbiddenException('Cannot delete your own account');
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: { deletedAt: new Date() },
    });
  }

  async getUserWithRoles(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    return {
      ...user,
      roles: user.roles.map((ur) => ur.role.name),
    };
  }

  async listUsers(query: UserQueryDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {
      deletedAt: null,
    };

    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    if (query.search) {
      where.OR = [
        { email: { contains: query.search } },
        { firstName: { contains: query.search } },
        { lastName: { contains: query.search } },
      ];
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          roles: {
            include: {
              role: true,
            },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users.map((user) => ({
        ...user,
        roles: user.roles.map((ur) => ur.role.name),
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async assignRolesToUser(userId: string, roleNames: string[]) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const roles = await this.prisma.role.findMany({
      where: {
        name: { in: roleNames },
        isActive: true,
        deletedAt: null,
      },
    });

    if (roles.length !== roleNames.length) {
      const foundRoleNames = roles.map((r) => r.name);
      const missingRoles = roleNames.filter((name) => !foundRoleNames.includes(name));
      throw new NotFoundException(`Roles not found: ${missingRoles.join(', ')}`);
    }

    // Remove existing roles
    await this.prisma.userRole.deleteMany({
      where: { userId },
    });

    // Assign new roles
    await this.prisma.userRole.createMany({
      data: roles.map((role) => ({
        userId,
        roleId: role.id,
      })),
    });

    return this.getUserWithRoles(userId);
  }

  async replaceUserRoles(userId: string, roleNames: string[]) {
    return this.assignRolesToUser(userId, roleNames);
  }

  async activateUser(userId: string, adminId: string) {
    return this.updateUser(userId, { isActive: true }, adminId);
  }

  async deactivateUser(userId: string, adminId: string) {
    return this.updateUser(userId, { isActive: false }, adminId);
  }

  // ==================== SCHOOL ONBOARDING ====================

  async onboardSchool(onboardDto: OnboardSchoolDto, adminId: string) {
    const existingSchool = await this.prisma.school.findUnique({
      where: { code: onboardDto.code },
    });

    if (existingSchool) {
      throw new ConflictException('School with this code already exists');
    }

    const school = await this.prisma.school.create({
      data: {
        name: onboardDto.name,
        code: onboardDto.code,
        address: onboardDto.address,
        city: onboardDto.city,
        state: onboardDto.state,
        country: onboardDto.country,
        postalCode: onboardDto.postalCode,
        isActive: onboardDto.isActive ?? false, // Default to inactive until approved
      },
    });

    this.logger.log(`School ${school.id} onboarded by admin ${adminId}`);

    return school;
  }

  async approveSchool(schoolId: string, approveDto: ApproveSchoolDto, adminId: string) {
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
    });

    if (!school) {
      throw new NotFoundException(`School with ID ${schoolId} not found`);
    }

    const updatedSchool = await this.prisma.school.update({
      where: { id: schoolId },
      data: {
        isActive: true,
      },
    });

    this.logger.log(`School ${schoolId} approved by admin ${adminId}`);

    return updatedSchool;
  }

  async createSchoolAdmin(schoolId: string, adminDto: CreateSchoolAdminDto, platformAdminId: string) {
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
    });

    if (!school) {
      throw new NotFoundException(`School with ID ${schoolId} not found`);
    }

    // Create user
    const user = await this.createUser(
      {
        email: adminDto.email,
        password: adminDto.password,
        firstName: adminDto.firstName,
        lastName: adminDto.lastName,
        isActive: true,
        roles: ['SchoolAdmin'],
      },
      platformAdminId,
    );

    this.logger.log(`School admin ${user.id} created for school ${schoolId} by platform admin ${platformAdminId}`);

    return user;
  }

  async listSchoolsForOnboarding() {
    return this.prisma.school.findMany({
      where: { deletedAt: null },
      include: {
        _count: {
          select: {
            classes: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ==================== CURRICULUM GOVERNANCE ====================

  async approveCurriculum(curriculumId: string, approveDto: ApproveCurriculumDto, adminId: string) {
    const curriculum = await this.prisma.curriculum.findUnique({
      where: { id: curriculumId },
    });

    if (!curriculum) {
      throw new NotFoundException(`Curriculum with ID ${curriculumId} not found`);
    }

    const updatedCurriculum = await this.prisma.curriculum.update({
      where: { id: curriculumId },
      data: {
        isActive: true,
      },
    });

    this.logger.log(`Curriculum ${curriculumId} approved by admin ${adminId}`);

    return updatedCurriculum;
  }

  async publishCurriculum(curriculumId: string, publishDto: PublishCurriculumDto, adminId: string) {
    const curriculum = await this.prisma.curriculum.findUnique({
      where: { id: curriculumId },
    });

    if (!curriculum) {
      throw new NotFoundException(`Curriculum with ID ${curriculumId} not found`);
    }

    // Deactivate other versions of the same curriculum
    await this.prisma.curriculum.updateMany({
      where: {
        name: curriculum.name,
        id: { not: curriculumId },
      },
      data: {
        isActive: false,
      },
    });

    const updatedCurriculum = await this.prisma.curriculum.update({
      where: { id: curriculumId },
      data: {
        isActive: true,
      },
    });

    this.logger.log(`Curriculum ${curriculumId} published by admin ${adminId}`);

    return updatedCurriculum;
  }

  async archiveCurriculum(curriculumId: string, archiveDto: ArchiveCurriculumDto, adminId: string) {
    const curriculum = await this.prisma.curriculum.findUnique({
      where: { id: curriculumId },
    });

    if (!curriculum) {
      throw new NotFoundException(`Curriculum with ID ${curriculumId} not found`);
    }

    const updatedCurriculum = await this.prisma.curriculum.update({
      where: { id: curriculumId },
      data: {
        isActive: false,
      },
    });

    this.logger.log(`Curriculum ${curriculumId} archived by admin ${adminId}. Reason: ${archiveDto.reason || 'N/A'}`);

    return updatedCurriculum;
  }

  async listCurriculaForGovernance() {
    return this.prisma.curriculum.findMany({
      where: { deletedAt: null },
      include: {
        _count: {
          select: {
            grades: true,
            schoolSelections: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ==================== CONTENT MODERATION ====================

  async moderateProject(projectId: string, moderateDto: ModerateContentDto, adminId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }

    let updatedProject;

    switch (moderateDto.action) {
      case 'approve':
        updatedProject = await this.prisma.project.update({
          where: { id: projectId },
          data: {
            status: 'active',
            isActive: true,
          },
        });
        break;
      case 'reject':
        updatedProject = await this.prisma.project.update({
          where: { id: projectId },
          data: {
            status: 'rejected',
            isActive: false,
          },
        });
        break;
      case 'flag':
        // Flag for review - keep status but mark
        updatedProject = await this.prisma.project.update({
          where: { id: projectId },
          data: {
            status: 'flagged',
          },
        });
        break;
      case 'remove':
        updatedProject = await this.prisma.project.update({
          where: { id: projectId },
          data: {
            isActive: false,
            deletedAt: new Date(),
          },
        });
        break;
      default:
        throw new BadRequestException(`Invalid moderation action: ${moderateDto.action}`);
    }

    this.logger.log(
      `Project ${projectId} moderated by admin ${adminId}. Action: ${moderateDto.action}, Reason: ${moderateDto.reason || 'N/A'}`,
    );

    return updatedProject;
  }

  async moderateSubmission(submissionId: string, moderateDto: ModerateContentDto, adminId: string) {
    const submission = await this.prisma.projectSubmission.findUnique({
      where: { id: submissionId },
      include: {
        project: true,
        student: true,
      },
    });

    if (!submission) {
      throw new NotFoundException(`Submission with ID ${submissionId} not found`);
    }

    let updatedSubmission;

    switch (moderateDto.action) {
      case 'approve':
        updatedSubmission = await this.prisma.projectSubmission.update({
          where: { id: submissionId },
          data: {
            status: 'approved',
            reviewStatus: 'approved',
            reviewedBy: adminId,
            reviewedAt: new Date(),
            reviewComment: moderateDto.notes || null,
          },
        });
        break;
      case 'reject':
        updatedSubmission = await this.prisma.projectSubmission.update({
          where: { id: submissionId },
          data: {
            status: 'rejected',
            reviewStatus: 'rejected',
            reviewedBy: adminId,
            reviewedAt: new Date(),
            reviewComment: moderateDto.reason || moderateDto.notes || 'Rejected by platform admin',
          },
        });
        break;
      case 'flag':
        updatedSubmission = await this.prisma.projectSubmission.update({
          where: { id: submissionId },
          data: {
            status: 'flagged',
          },
        });
        break;
      case 'remove':
        updatedSubmission = await this.prisma.projectSubmission.update({
          where: { id: submissionId },
          data: {
            deletedAt: new Date(),
          },
        });
        break;
      default:
        throw new BadRequestException(`Invalid moderation action: ${moderateDto.action}`);
    }

    this.logger.log(
      `Submission ${submissionId} moderated by admin ${adminId}. Action: ${moderateDto.action}, Reason: ${moderateDto.reason || 'N/A'}`,
    );

    return updatedSubmission;
  }

  async listContentForModeration(query: ContentQueryDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {
      deletedAt: null,
    };

    if (query.status) {
      where.status = query.status;
    }

    const [projects, submissions, totalProjects, totalSubmissions] = await Promise.all([
      this.prisma.project.findMany({
        where: query.contentType === 'project' || !query.contentType ? where : { id: 'none' },
        skip: query.contentType === 'project' || !query.contentType ? skip : 0,
        take: query.contentType === 'project' || !query.contentType ? limit : 0,
        orderBy: { createdAt: 'desc' },
        include: {
          template: {
            select: {
              id: true,
              title: true,
              category: true,
            },
          },
          _count: {
            select: {
              assignments: true,
              submissions: true,
            },
          },
        },
      }),
      this.prisma.projectSubmission.findMany({
        where: query.contentType === 'submission' || !query.contentType ? where : { id: 'none' },
        skip: query.contentType === 'submission' || !query.contentType ? skip : 0,
        take: query.contentType === 'submission' || !query.contentType ? limit : 0,
        orderBy: { createdAt: 'desc' },
        include: {
          project: {
            select: {
              id: true,
              name: true,
            },
          },
          student: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      this.prisma.project.count({
        where: query.contentType === 'project' || !query.contentType ? where : { id: 'none' },
      }),
      this.prisma.projectSubmission.count({
        where: query.contentType === 'submission' || !query.contentType ? where : { id: 'none' },
      }),
    ]);

    return {
      projects: {
        data: projects,
        pagination: {
          page: query.contentType === 'project' || !query.contentType ? page : 1,
          limit: query.contentType === 'project' || !query.contentType ? limit : 0,
          total: totalProjects,
          totalPages: Math.ceil(totalProjects / limit),
        },
      },
      submissions: {
        data: submissions,
        pagination: {
          page: query.contentType === 'submission' || !query.contentType ? page : 1,
          limit: query.contentType === 'submission' || !query.contentType ? limit : 0,
          total: totalSubmissions,
          totalPages: Math.ceil(totalSubmissions / limit),
        },
      },
    };
  }

  // ==================== GLOBAL ANALYTICS ====================

  async getDashboardStats() {
    const [
      totalUsers,
      activeUsers,
      totalSchools,
      activeSchools,
      totalClasses,
      totalProjects,
      totalSubmissions,
      totalSkills,
      totalPayments,
      totalRevenue,
    ] = await Promise.all([
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.user.count({ where: { isActive: true, deletedAt: null } }),
      this.prisma.school.count({ where: { deletedAt: null } }),
      this.prisma.school.count({ where: { isActive: true, deletedAt: null } }),
      this.prisma.class.count({ where: { deletedAt: null } }),
      this.prisma.project.count({ where: { deletedAt: null } }),
      this.prisma.projectSubmission.count({ where: { deletedAt: null } }),
      this.prisma.studentSkill.count(),
      this.prisma.payment.count(),
      this.prisma.payment.aggregate({
        where: { status: 'completed' },
        _sum: { amount: true },
      }),
    ]);

    return {
      users: {
        total: totalUsers,
        active: activeUsers,
        inactive: totalUsers - activeUsers,
      },
      schools: {
        total: totalSchools,
        active: activeSchools,
        inactive: totalSchools - activeSchools,
      },
      classes: {
        total: totalClasses,
      },
      projects: {
        total: totalProjects,
      },
      submissions: {
        total: totalSubmissions,
      },
      skills: {
        total: totalSkills,
      },
      payments: {
        total: totalPayments,
        revenue: totalRevenue._sum.amount ? Number(totalRevenue._sum.amount) : 0,
      },
    };
  }

  async getUserAnalytics(query: AnalyticsQueryDto) {
    const startDate = query.startDate ? new Date(query.startDate) : undefined;
    const endDate = query.endDate ? new Date(query.endDate) : undefined;

    const where: any = {
      deletedAt: null,
    };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [totalUsers, usersByRole, activeUsers, newUsers] = await Promise.all([
      this.prisma.user.count({ where }),
      this.getUsersByRole(where),
      this.prisma.user.count({
        where: {
          ...where,
          isActive: true,
        },
      }),
      this.getNewUsersOverTime(where),
    ]);

    return {
      total: totalUsers,
      active: activeUsers,
      inactive: totalUsers - activeUsers,
      byRole: usersByRole,
      growth: newUsers,
    };
  }

  async getSchoolAnalytics(query: AnalyticsQueryDto) {
    const startDate = query.startDate ? new Date(query.startDate) : undefined;
    const endDate = query.endDate ? new Date(query.endDate) : undefined;

    const where: any = {
      deletedAt: null,
    };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [totalSchools, activeSchools, schoolsWithClasses] = await Promise.all([
      this.prisma.school.count({ where }),
      this.prisma.school.count({
        where: {
          ...where,
          isActive: true,
        },
      }),
      this.prisma.school.count({
        where,
        include: {
          classes: {
            where: { deletedAt: null },
          },
        },
      }),
    ]);

    return {
      total: totalSchools,
      active: activeSchools,
      inactive: totalSchools - activeSchools,
      withClasses: schoolsWithClasses,
    };
  }

  async getProjectAnalytics(query: AnalyticsQueryDto) {
    const startDate = query.startDate ? new Date(query.startDate) : undefined;
    const endDate = query.endDate ? new Date(query.endDate) : undefined;

    const where: any = {
      deletedAt: null,
    };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [totalProjects, projectsByStatus, projectsByCategory] = await Promise.all([
      this.prisma.project.count({ where }),
      this.getProjectsByStatus(where),
      this.getProjectsByCategory(where),
    ]);

    return {
      total: totalProjects,
      byStatus: projectsByStatus,
      byCategory: projectsByCategory,
    };
  }

  // Helper methods for analytics

  private async getUsersByRole(where: any) {
    const userRoles = await this.prisma.userRole.findMany({
      where: {
        user: where,
      },
      include: {
        role: true,
      },
    });

    const roleCounts: Record<string, number> = {};
    userRoles.forEach((ur) => {
      const roleName = ur.role.name;
      roleCounts[roleName] = (roleCounts[roleName] || 0) + 1;
    });

    return roleCounts;
  }

  private async getNewUsersOverTime(where: any) {
    const users = await this.prisma.user.findMany({
      where,
      select: {
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Group by month
    const monthlyCounts: Record<string, number> = {};
    users.forEach((user) => {
      const month = new Date(user.createdAt).toISOString().slice(0, 7); // YYYY-MM
      monthlyCounts[month] = (monthlyCounts[month] || 0) + 1;
    });

    return monthlyCounts;
  }

  private async getProjectsByStatus(where: any) {
    const projects = await this.prisma.project.findMany({
      where,
      select: {
        status: true,
      },
    });

    const statusCounts: Record<string, number> = {};
    projects.forEach((project) => {
      statusCounts[project.status] = (statusCounts[project.status] || 0) + 1;
    });

    return statusCounts;
  }

  private async getProjectsByCategory(where: any) {
    const projects = await this.prisma.project.findMany({
      where,
      include: {
        template: {
          select: {
            category: true,
          },
        },
      },
    });

    const categoryCounts: Record<string, number> = {};
    projects.forEach((project) => {
      const category = project.template?.category || 'Uncategorized';
      categoryCounts[category] = (categoryCounts[category] || 0) + 1;
    });

    return categoryCounts;
  }

  async getRecentActivity(limit: number = 50) {
    const [recentUsers, recentPayments, recentAuditLogs] = await Promise.all([
      this.prisma.user.findMany({
        take: limit,
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          createdAt: true,
        },
      }),
      this.prisma.payment.findMany({
        take: limit,
        orderBy: { createdAt: 'desc' },
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
      }),
      this.prisma.auditLog.findMany({
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              email: true,
            },
          },
        },
      }),
    ]);

    return {
      recentUsers,
      recentPayments,
      recentAuditLogs,
    };
  }
}
