import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AuthService } from '../auth/auth.service';
import { CreateTeacherDto, UpdateTeacherDto, TeacherQueryDto } from './dto/teacher-management.dto';
import { ReportQueryDto, ReportType } from './dto/reports.dto';
import { ClassQueryDto } from './dto/class-oversight.dto';

@Injectable()
export class SchoolAdminService {
  private readonly logger = new Logger(SchoolAdminService.name);

  constructor(
    private prisma: PrismaService,
    private authService: AuthService,
  ) {}

  /**
   * Validate that the admin has access to the specified school
   * Note: In production, implement a UserSchool relationship table to properly validate access
   */
  async validateSchoolAccess(adminId: string, schoolId: string): Promise<void> {
    // Get user with roles
    const user = await this.prisma.user.findUnique({
      where: { id: adminId },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if user is a SchoolAdmin
    const isSchoolAdmin = user.roles.some((ur) => ur.role.name === 'SchoolAdmin');
    if (!isSchoolAdmin) {
      throw new ForbiddenException('User is not a SchoolAdmin');
    }

    // Check if school exists
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
    });

    if (!school) {
      throw new NotFoundException(`School with ID ${schoolId} not found`);
    }

    // TODO: In production, add actual access validation:
    // const userSchool = await this.prisma.userSchool.findUnique({
    //   where: { userId_schoolId: { userId: adminId, schoolId } }
    // });
    // if (!userSchool) {
    //   throw new ForbiddenException('Admin does not have access to this school');
    // }
  }

  // ==================== TEACHER MANAGEMENT ====================

  async createTeacher(schoolId: string, createTeacherDto: CreateTeacherDto, adminId: string) {
    await this.validateSchoolAccess(adminId, schoolId);

    const existingUser = await this.prisma.user.findUnique({
      where: { email: createTeacherDto.email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const passwordHash = await this.authService.hashPassword(createTeacherDto.password);

    const user = await this.prisma.user.create({
      data: {
        email: createTeacherDto.email,
        passwordHash,
        firstName: createTeacherDto.firstName,
        lastName: createTeacherDto.lastName,
        isActive: createTeacherDto.isActive ?? true,
      },
    });

    // Assign Teacher role
    const teacherRole = await this.prisma.role.findUnique({
      where: { name: 'Teacher' },
    });

    if (!teacherRole) {
      throw new NotFoundException('Teacher role not found');
    }

    await this.prisma.userRole.create({
      data: {
        userId: user.id,
        roleId: teacherRole.id,
      },
    });

    this.logger.log(`Teacher ${user.id} created for school ${schoolId} by admin ${adminId}`);

    return this.getTeacherWithDetails(user.id);
  }

  async updateTeacher(schoolId: string, teacherId: string, updateTeacherDto: UpdateTeacherDto, adminId: string) {
    await this.validateSchoolAccess(adminId, schoolId);

    const teacher = await this.getTeacherWithDetails(teacherId);

    // Verify teacher has Teacher role
    if (!teacher.roles.includes('Teacher')) {
      throw new BadRequestException('User is not a teacher');
    }

    // Check email uniqueness if updating email
    if (updateTeacherDto.email && updateTeacherDto.email !== teacher.email) {
      const existingUser = await this.prisma.user.findUnique({
        where: { email: updateTeacherDto.email },
      });
      if (existingUser) {
        throw new ConflictException('User with this email already exists');
      }
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: teacherId },
      data: {
        email: updateTeacherDto.email,
        firstName: updateTeacherDto.firstName,
        lastName: updateTeacherDto.lastName,
        isActive: updateTeacherDto.isActive,
      },
    });

    return this.getTeacherWithDetails(updatedUser.id);
  }

  async listTeachers(schoolId: string, query: TeacherQueryDto, adminId: string) {
    await this.validateSchoolAccess(adminId, schoolId);

    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    // Get Teacher role ID
    const teacherRole = await this.prisma.role.findUnique({
      where: { name: 'Teacher' },
    });

    if (!teacherRole) {
      throw new NotFoundException('Teacher role not found');
    }

    const where: any = {
      deletedAt: null,
      roles: {
        some: {
          roleId: teacherRole.id,
        },
      },
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

    const [teachers, total] = await Promise.all([
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
      data: teachers.map((teacher) => ({
        id: teacher.id,
        email: teacher.email,
        firstName: teacher.firstName,
        lastName: teacher.lastName,
        isActive: teacher.isActive,
        roles: teacher.roles.map((ur) => ur.role.name),
        createdAt: teacher.createdAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getTeacher(schoolId: string, teacherId: string, adminId: string) {
    await this.validateSchoolAccess(adminId, schoolId);
    return this.getTeacherWithDetails(teacherId);
  }

  async activateTeacher(schoolId: string, teacherId: string, adminId: string) {
    await this.validateSchoolAccess(adminId, schoolId);
    return this.updateTeacher(schoolId, teacherId, { isActive: true }, adminId);
  }

  async deactivateTeacher(schoolId: string, teacherId: string, adminId: string) {
    await this.validateSchoolAccess(adminId, schoolId);
    return this.updateTeacher(schoolId, teacherId, { isActive: false }, adminId);
  }

  private async getTeacherWithDetails(teacherId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: teacherId },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`Teacher with ID ${teacherId} not found`);
    }

    return {
      ...user,
      roles: user.roles.map((ur) => ur.role.name),
    };
  }

  // ==================== CLASS OVERSIGHT ====================

  async listClasses(schoolId: string, query: ClassQueryDto, adminId: string) {
    await this.validateSchoolAccess(adminId, schoolId);

    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {
      schoolId,
      deletedAt: null,
    };

    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    if (query.grade) {
      where.grade = query.grade;
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search } },
        { code: { contains: query.search } },
      ];
    }

    const [classes, total] = await Promise.all([
      this.prisma.class.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        include: {
          _count: {
            select: {
              // Note: In production, you'd have a ClassStudent relationship
              // For now, we'll count from project assignments
            },
          },
        },
      }),
      this.prisma.class.count({ where }),
    ]);

    // Get student counts from project assignments (simplified approach)
    const classIds = classes.map((c) => c.id);
    const studentCounts = await this.getStudentCountsByClass(classIds);

    return {
      data: classes.map((cls) => ({
        ...cls,
        studentCount: studentCounts[cls.id] || 0,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getClassDetails(schoolId: string, classId: string, adminId: string) {
    await this.validateSchoolAccess(adminId, schoolId);

    const classEntity = await this.prisma.class.findUnique({
      where: { id: classId },
      include: {
        school: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    if (!classEntity) {
      throw new NotFoundException(`Class with ID ${classId} not found`);
    }

    if (classEntity.schoolId !== schoolId) {
      throw new ForbiddenException('Class does not belong to this school');
    }

    // Get students (from project assignments - simplified)
    const students = await this.getStudentsForClass(classId);
    const projects = await this.getProjectsForClass(classId);
    const submissions = await this.getSubmissionsForClass(classId);

    return {
      ...classEntity,
      students,
      projects,
      submissions,
      statistics: {
        studentCount: students.length,
        projectCount: projects.length,
        submissionCount: submissions.length,
        averageGrade: this.calculateAverageGrade(submissions),
      },
    };
  }

  private async getStudentCountsByClass(classIds: string[]): Promise<Record<string, number>> {
    // Simplified: Get unique students from project assignments
    // In production, use ClassStudent relationship
    const assignments = await this.prisma.projectAssignment.findMany({
      where: {
        // Note: ProjectAssignment doesn't have classId, so this is a simplified approach
        // In production, you'd query: SELECT classId, COUNT(DISTINCT studentId) FROM class_students WHERE classId IN (...)
      },
      select: {
        studentId: true,
      },
      distinct: ['studentId'],
    });

    // For now, return empty counts - in production, implement proper ClassStudent relationship
    const counts: Record<string, number> = {};
    classIds.forEach((id) => {
      counts[id] = 0;
    });
    return counts;
  }

  private async getStudentsForClass(classId: string) {
    // Simplified: Get students from project assignments
    // In production, use ClassStudent relationship
    const assignments = await this.prisma.projectAssignment.findMany({
      select: {
        student: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            isActive: true,
          },
        },
      },
      distinct: ['studentId'],
      take: 100, // Limit for now
    });

    return assignments.map((a) => a.student);
  }

  private async getProjectsForClass(classId: string) {
    // Get projects assigned to students in this class
    // Simplified approach - in production, link projects to classes
    return [];
  }

  private async getSubmissionsForClass(classId: string) {
    // Get submissions from students in this class
    // Simplified approach
    return [];
  }

  private calculateAverageGrade(submissions: any[]): number | null {
    const grades = submissions
      .map((s) => s.grade)
      .filter((g) => g !== null && g !== undefined)
      .map((g) => Number(g));

    if (grades.length === 0) {
      return null;
    }

    const sum = grades.reduce((acc, grade) => acc + grade, 0);
    return Math.round((sum / grades.length) * 100) / 100;
  }

  // ==================== REPORTS ====================

  async generateReport(schoolId: string, query: ReportQueryDto, adminId: string) {
    await this.validateSchoolAccess(adminId, schoolId);

    const startDate = query.startDate ? new Date(query.startDate) : undefined;
    const endDate = query.endDate ? new Date(query.endDate) : undefined;

    switch (query.type) {
      case ReportType.OVERVIEW:
        return this.generateOverviewReport(schoolId, startDate, endDate);
      case ReportType.STUDENTS:
        return this.generateStudentsReport(schoolId, startDate, endDate);
      case ReportType.TEACHERS:
        return this.generateTeachersReport(schoolId, startDate, endDate);
      case ReportType.CLASSES:
        return this.generateClassesReport(schoolId, startDate, endDate);
      case ReportType.PROJECTS:
        return this.generateProjectsReport(schoolId, startDate, endDate, query.classId);
      case ReportType.SUBMISSIONS:
        return this.generateSubmissionsReport(schoolId, startDate, endDate, query.classId);
      case ReportType.SKILLS:
        return this.generateSkillsReport(schoolId, startDate, endDate);
      default:
        return this.generateOverviewReport(schoolId, startDate, endDate);
    }
  }

  private async generateOverviewReport(schoolId: string, startDate?: Date, endDate?: Date) {
    const where: any = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [
      totalStudents,
      totalTeachers,
      totalClasses,
      totalProjects,
      totalSubmissions,
      totalSkills,
    ] = await Promise.all([
      this.getStudentCountForSchool(schoolId, where),
      this.getTeacherCountForSchool(schoolId, where),
      this.prisma.class.count({ where: { schoolId, deletedAt: null, ...where } }),
      this.getProjectCountForSchool(schoolId, where),
      this.getSubmissionCountForSchool(schoolId, where),
      this.getSkillCountForSchool(schoolId, where),
    ]);

    return {
      type: 'overview',
      schoolId,
      period: {
        startDate: startDate?.toISOString(),
        endDate: endDate?.toISOString(),
      },
      statistics: {
        students: totalStudents,
        teachers: totalTeachers,
        classes: totalClasses,
        projects: totalProjects,
        submissions: totalSubmissions,
        skills: totalSkills,
      },
      generatedAt: new Date().toISOString(),
    };
  }

  private async generateStudentsReport(schoolId: string, startDate?: Date, endDate?: Date) {
    // Get students (simplified - in production, use ClassStudent relationship)
    const students = await this.getStudentsForSchool(schoolId);

    return {
      type: 'students',
      schoolId,
      period: {
        startDate: startDate?.toISOString(),
        endDate: endDate?.toISOString(),
      },
      data: students,
      total: students.length,
      generatedAt: new Date().toISOString(),
    };
  }

  private async generateTeachersReport(schoolId: string, startDate?: Date, endDate?: Date) {
    const teachers = await this.getTeachersForSchool(schoolId);

    return {
      type: 'teachers',
      schoolId,
      period: {
        startDate: startDate?.toISOString(),
        endDate: endDate?.toISOString(),
      },
      data: teachers,
      total: teachers.length,
      generatedAt: new Date().toISOString(),
    };
  }

  private async generateClassesReport(schoolId: string, startDate?: Date, endDate?: Date) {
    const classes = await this.prisma.class.findMany({
      where: {
        schoolId,
        deletedAt: null,
      },
      include: {
        _count: {
          select: {},
        },
      },
    });

    return {
      type: 'classes',
      schoolId,
      period: {
        startDate: startDate?.toISOString(),
        endDate: endDate?.toISOString(),
      },
      data: classes,
      total: classes.length,
      generatedAt: new Date().toISOString(),
    };
  }

  private async generateProjectsReport(schoolId: string, startDate?: Date, endDate?: Date, classId?: string) {
    // Get projects for school (simplified)
    const projects = await this.prisma.project.findMany({
      where: {
        deletedAt: null,
      },
      take: 100,
    });

    return {
      type: 'projects',
      schoolId,
      classId,
      period: {
        startDate: startDate?.toISOString(),
        endDate: endDate?.toISOString(),
      },
      data: projects,
      total: projects.length,
      generatedAt: new Date().toISOString(),
    };
  }

  private async generateSubmissionsReport(schoolId: string, startDate?: Date, endDate?: Date, classId?: string) {
    const submissions = await this.prisma.projectSubmission.findMany({
      where: {
        deletedAt: null,
      },
      take: 100,
    });

    return {
      type: 'submissions',
      schoolId,
      classId,
      period: {
        startDate: startDate?.toISOString(),
        endDate: endDate?.toISOString(),
      },
      data: submissions,
      total: submissions.length,
      generatedAt: new Date().toISOString(),
    };
  }

  private async generateSkillsReport(schoolId: string, startDate?: Date, endDate?: Date) {
    const skills = await this.prisma.studentSkill.findMany({
      take: 100,
    });

    return {
      type: 'skills',
      schoolId,
      period: {
        startDate: startDate?.toISOString(),
        endDate: endDate?.toISOString(),
      },
      data: skills,
      total: skills.length,
      generatedAt: new Date().toISOString(),
    };
  }

  // Helper methods for reports

  private async getStudentCountForSchool(schoolId: string, where: any): Promise<number> {
    // Simplified - in production, use ClassStudent relationship
    return 0;
  }

  private async getTeacherCountForSchool(schoolId: string, where: any): Promise<number> {
    const teacherRole = await this.prisma.role.findUnique({
      where: { name: 'Teacher' },
    });

    if (!teacherRole) {
      return 0;
    }

    return this.prisma.user.count({
      where: {
        deletedAt: null,
        roles: {
          some: {
            roleId: teacherRole.id,
          },
        },
        ...where,
      },
    });
  }

  private async getProjectCountForSchool(schoolId: string, where: any): Promise<number> {
    // Simplified - in production, link projects to schools
    return this.prisma.project.count({
      where: {
        deletedAt: null,
        ...where,
      },
    });
  }

  private async getSubmissionCountForSchool(schoolId: string, where: any): Promise<number> {
    // Simplified
    return this.prisma.projectSubmission.count({
      where: {
        deletedAt: null,
        ...where,
      },
    });
  }

  private async getSkillCountForSchool(schoolId: string, where: any): Promise<number> {
    // Simplified
    return this.prisma.studentSkill.count();
  }

  private async getStudentsForSchool(schoolId: string) {
    // Simplified - in production, use ClassStudent relationship
    return [];
  }

  private async getTeachersForSchool(schoolId: string) {
    const teacherRole = await this.prisma.role.findUnique({
      where: { name: 'Teacher' },
    });

    if (!teacherRole) {
      return [];
    }

    const teachers = await this.prisma.user.findMany({
      where: {
        deletedAt: null,
        roles: {
          some: {
            roleId: teacherRole.id,
          },
        },
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true,
        createdAt: true,
      },
    });

    return teachers;
  }

  // ==================== SUBSCRIPTION STATUS ====================

  async getSubscriptionStatus(schoolId: string, adminId: string) {
    await this.validateSchoolAccess(adminId, schoolId);

    // Get school details
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
    });

    if (!school) {
      throw new NotFoundException(`School with ID ${schoolId} not found`);
    }

    // Get payments for school (simplified - in production, link payments to schools)
    // For now, we'll check if school is active as a proxy for subscription status
    const recentPayments = await this.prisma.payment.findMany({
      where: {
        status: 'completed',
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
    });

    // Calculate subscription status
    const subscriptionStatus = {
      schoolId: school.id,
      schoolName: school.name,
      isActive: school.isActive,
      subscriptionActive: school.isActive, // Simplified - in production, check actual subscription
      lastPayment: recentPayments[0] ? {
        amount: Number(recentPayments[0].amount),
        currency: recentPayments[0].currency,
        date: recentPayments[0].createdAt,
        status: recentPayments[0].status,
      } : null,
      totalPayments: recentPayments.length,
      // In production, add: subscriptionPlan, renewalDate, billingCycle, etc.
    };

    return subscriptionStatus;
  }
}

