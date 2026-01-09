import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class ParentDashboardService {
  private readonly logger = new Logger(ParentDashboardService.name);

  constructor(private prisma: PrismaService) {}

  async getDashboard(parentId: string) {
    // Verify user is a parent
    const parent = await this.prisma.user.findUnique({
      where: { id: parentId },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!parent) {
      throw new NotFoundException('Parent not found');
    }

    const isParent = parent.roles.some((ur) => ur.role.name === 'Parent');
    if (!isParent) {
      throw new ForbiddenException('User is not a parent');
    }

    // Get all children (students) with approved consent
    const consents = await this.prisma.parentConsent.findMany({
      where: {
        parentId,
        status: 'approved',
        consentGiven: true,
        deletedAt: null,
      },
      include: {
        student: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            dateOfBirth: true,
            isActive: true,
          },
        },
      },
    });

    const childrenIds = consents.map((c) => c.studentId);

    if (childrenIds.length === 0) {
      return {
        parent: {
          id: parent.id,
          email: parent.email,
          firstName: parent.firstName,
          lastName: parent.lastName,
        },
        children: [],
        childProjects: [],
        skillGrowth: [],
        notifications: [],
        consentStatus: [],
        summary: {
          totalChildren: 0,
          totalProjects: 0,
          totalSkills: 0,
          unreadNotifications: 0,
        },
      };
    }

    // Execute all queries in parallel for optimal performance
    const [childProjects, skillGrowth, notifications, consentStatus] = await Promise.all([
      this.getChildProjects(childrenIds),
      this.getSkillGrowth(childrenIds),
      this.getNotifications(parentId),
      this.getConsentStatus(parentId),
    ]);

    return {
      parent: {
        id: parent.id,
        email: parent.email,
        firstName: parent.firstName,
        lastName: parent.lastName,
      },
      children: consents.map((c) => ({
        id: c.student.id,
        email: c.student.email,
        firstName: c.student.firstName,
        lastName: c.student.lastName,
        dateOfBirth: c.student.dateOfBirth,
        isActive: c.student.isActive,
        consentDate: c.consentDate,
      })),
      childProjects,
      skillGrowth,
      notifications,
      consentStatus,
      summary: {
        totalChildren: consents.length,
        totalProjects: childProjects.length,
        totalSkills: skillGrowth.reduce((sum, child) => sum + child.totalSkills, 0),
        unreadNotifications: notifications.filter((n) => !n.isRead).length,
      },
    };
  }

  async getChildProjects(childrenIds: string[]) {
    // Get all projects for children (approved submissions only)
    const submissions = await this.prisma.projectSubmission.findMany({
      where: {
        studentId: { in: childrenIds },
        status: {
          in: ['submitted', 'under_review', 'approved', 'graded'],
        },
        deletedAt: null,
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            description: true,
            status: true,
            startDate: true,
            endDate: true,
            template: {
              select: {
                id: true,
                title: true,
                category: true,
              },
            },
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
        assignment: {
          select: {
            id: true,
            dueDate: true,
            status: true,
          },
        },
        reviewer: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        _count: {
          select: {
            media: true,
          },
        },
      },
      orderBy: {
        submittedAt: 'desc',
      },
    });

    return submissions.map((submission) => ({
      id: submission.id,
      project: submission.project,
      student: submission.student,
      status: submission.status,
      submittedAt: submission.submittedAt,
      reviewedAt: submission.reviewedAt,
      grade: submission.grade ? Number(submission.grade) : null,
      feedback: submission.feedback,
      reviewer: submission.reviewer,
      assignment: submission.assignment,
      mediaCount: submission._count.media,
    }));
  }

  async getSkillGrowth(childrenIds: string[]) {
    // Get skill growth for all children
    const skillData = await this.prisma.studentSkill.findMany({
      where: {
        studentId: { in: childrenIds },
      },
      include: {
        skill: {
          select: {
            id: true,
            name: true,
            category: true,
            description: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
            template: {
              select: {
                category: true,
              },
            },
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
        endorser: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        endorsementDate: 'desc',
      },
    });

    // Group by student
    const skillsByStudent = new Map<string, any[]>();

    skillData.forEach((skill) => {
      if (!skillsByStudent.has(skill.studentId)) {
        skillsByStudent.set(skill.studentId, []);
      }
      skillsByStudent.get(skill.studentId)!.push({
        id: skill.id,
        skill: skill.skill,
        level: skill.level,
        progress: Number(skill.progress),
        project: skill.project,
        endorsedBy: skill.endorser,
        endorsementDate: skill.endorsementDate,
        lastUpdated: skill.lastUpdated,
      });
    });

    // Format response
    return Array.from(skillsByStudent.entries()).map(([studentId, skills]) => {
      const student = skillData.find((s) => s.studentId === studentId)?.student;
      const totalMaturity = skills.reduce(
        (sum, s) => sum + s.level * 10 + s.progress,
        0,
      );
      const averageMaturity = skills.length > 0 ? totalMaturity / skills.length : 0;

      return {
        studentId,
        student: {
          id: student?.id,
          email: student?.email,
          firstName: student?.firstName,
          lastName: student?.lastName,
        },
        totalSkills: skills.length,
        averageLevel: skills.length > 0
          ? skills.reduce((sum, s) => sum + s.level, 0) / skills.length
          : 0,
        averageMaturity: Math.round(averageMaturity * 100) / 100,
        skills: skills.map((s) => ({
          ...s,
          maturity: s.level * 10 + s.progress,
        })),
      };
    });
  }

  async getNotifications(parentId: string) {
    // Get notifications for the parent
    const notifications = await this.prisma.notification.findMany({
      where: {
        userId: parentId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50, // Limit to most recent 50
    });

    return notifications.map((notification) => ({
      id: notification.id,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      isRead: notification.isRead,
      readAt: notification.readAt,
      createdAt: notification.createdAt,
    }));
  }

  async getConsentStatus(parentId: string) {
    // Get all consent records for this parent
    const consents = await this.prisma.parentConsent.findMany({
      where: {
        parentId,
        deletedAt: null,
      },
      include: {
        student: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            dateOfBirth: true,
            isActive: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return consents.map((consent) => ({
      id: consent.id,
      student: consent.student,
      status: consent.status,
      consentGiven: consent.consentGiven,
      consentDate: consent.consentDate,
      revokedDate: consent.revokedDate,
      invitedAt: consent.invitedAt,
      expiresAt: consent.expiresAt,
      notes: consent.notes,
      isExpired: new Date(consent.expiresAt) < new Date(),
    }));
  }

  async getChildDetails(parentId: string, childId: string) {
    // Verify parent has consent for this child
    const consent = await this.prisma.parentConsent.findFirst({
      where: {
        parentId,
        studentId: childId,
        status: 'approved',
        consentGiven: true,
        deletedAt: null,
      },
    });

    if (!consent) {
      throw new ForbiddenException('You do not have access to this child\'s information');
    }

    // Get child details with projects and skills
    const [child, projects, skills] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: childId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          dateOfBirth: true,
          isActive: true,
          createdAt: true,
        },
      }),
      this.getChildProjects([childId]),
      this.getSkillGrowth([childId]),
    ]);

    if (!child) {
      throw new NotFoundException('Child not found');
    }

    return {
      child,
      projects,
      skills: skills[0] || {
        studentId: childId,
        student: child,
        totalSkills: 0,
        averageLevel: 0,
        averageMaturity: 0,
        skills: [],
      },
      consent: {
        id: consent.id,
        status: consent.status,
        consentGiven: consent.consentGiven,
        consentDate: consent.consentDate,
        revokedDate: consent.revokedDate,
      },
    };
  }
}

