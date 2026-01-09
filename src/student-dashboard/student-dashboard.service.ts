import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class StudentDashboardService {
  constructor(private prisma: PrismaService) {}

  async getDashboard(studentId: string, requestingUserId: string) {
    if (studentId !== requestingUserId) {
      throw new ForbiddenException('You can only access your own dashboard');
    }

    const [
      skillSnapshot,
      activeAssignments,
      submittedProjects,
      badges,
      notifications,
    ] = await Promise.all([
      this.getSkillSnapshot(studentId),
      this.getActiveProjectAssignments(studentId),
      this.getSubmittedProjects(studentId),
      this.getBadges(studentId),
      this.getNotifications(studentId),
    ]);

    return {
      skillSnapshot,
      activeProjectAssignments: activeAssignments,
      submittedProjects,
      badges,
      notifications,
    };
  }

  private async getSkillSnapshot(studentId: string) {
    const studentSkills = await this.prisma.studentSkill.findMany({
      where: {
        studentId,
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
      },
      orderBy: [
        { level: 'desc' },
        { progress: 'desc' },
        { lastUpdated: 'desc' },
      ],
    });

    const skillsByCategory = studentSkills.reduce((acc, studentSkill) => {
      const category = studentSkill.skill.category || 'Uncategorized';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push({
        skillId: studentSkill.skill.id,
        skillName: studentSkill.skill.name,
        description: studentSkill.skill.description,
        level: studentSkill.level,
        progress: Number(studentSkill.progress),
        lastUpdated: studentSkill.lastUpdated,
      });
      return acc;
    }, {} as Record<string, any[]>);

    const totalSkills = studentSkills.length;
    const averageLevel =
      totalSkills > 0
        ? studentSkills.reduce((sum, ss) => sum + ss.level, 0) / totalSkills
        : 0;
    const averageProgress =
      totalSkills > 0
        ? studentSkills.reduce((sum, ss) => sum + Number(ss.progress), 0) /
          totalSkills
        : 0;
    const categoriesCount = Object.keys(skillsByCategory).length;

    return {
      totalSkills,
      averageLevel: Math.round(averageLevel * 100) / 100,
      averageProgress: Math.round(averageProgress * 100) / 100,
      categoriesCount,
      skillsByCategory,
      recentSkills: studentSkills.slice(0, 5).map((ss) => ({
        skillId: ss.skill.id,
        skillName: ss.skill.name,
        category: ss.skill.category,
        level: ss.level,
        progress: Number(ss.progress),
        lastUpdated: ss.lastUpdated,
      })),
    };
  }

  private async getActiveProjectAssignments(studentId: string) {
    const now = new Date();

    const assignments = await this.prisma.projectAssignment.findMany({
      where: {
        studentId,
        status: {
          in: ['assigned', 'in_progress'],
        },
        project: {
          isActive: true,
          deletedAt: null,
        },
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            description: true,
            startDate: true,
            endDate: true,
            status: true,
          },
        },
      },
      orderBy: [
        { dueDate: 'asc' },
        { assignedAt: 'desc' },
      ],
    });

    const assignmentIds = assignments.map((a) => a.id);
    const submissions = await this.prisma.projectSubmission.findMany({
      where: {
        studentId,
        assignmentId: {
          in: assignmentIds,
        },
        status: {
          in: ['submitted', 'graded'],
        },
      },
      select: {
        assignmentId: true,
      },
    });

    const submissionMap = new Set(
      submissions.map((s) => s.assignmentId).filter((id) => id !== null),
    );

    return assignments.map((assignment) => {
      const isOverdue = assignment.dueDate
        ? new Date(assignment.dueDate) < now
        : false;
      const daysUntilDue = assignment.dueDate
        ? Math.ceil(
            (new Date(assignment.dueDate).getTime() - now.getTime()) /
              (1000 * 60 * 60 * 24),
          )
        : null;

      return {
        assignmentId: assignment.id,
        projectId: assignment.project.id,
        projectName: assignment.project.name,
        description: assignment.project.description,
        status: assignment.status,
        assignedAt: assignment.assignedAt,
        dueDate: assignment.dueDate,
        isOverdue,
        daysUntilDue,
        notes: assignment.notes,
        hasSubmission: submissionMap.has(assignment.id),
      };
    });
  }

  private async getSubmittedProjects(studentId: string) {
    const submissions = await this.prisma.projectSubmission.findMany({
      where: {
        studentId,
        status: {
          in: ['submitted', 'graded', 'returned'],
        },
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            description: true,
            status: true,
          },
        },
      },
      orderBy: {
        submittedAt: 'desc',
      },
      take: 20,
    });

    return submissions.map((submission) => ({
      submissionId: submission.id,
      projectId: submission.project.id,
      projectName: submission.project.name,
      description: submission.project.description,
      status: submission.status,
      submittedAt: submission.submittedAt,
      grade: submission.grade ? Number(submission.grade) : null,
      feedback: submission.feedback,
      hasGrade: submission.grade !== null,
    }));
  }

  private async getBadges(studentId: string) {
    const badges = await this.prisma.badge.findMany({
      where: {
        studentId,
      },
      orderBy: {
        earnedAt: 'desc',
      },
    });

    const badgesByCategory = badges.reduce((acc, badge) => {
      const category = badge.category || 'Uncategorized';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push({
        badgeId: badge.id,
        name: badge.name,
        description: badge.description,
        category: badge.category,
        icon: badge.icon,
        earnedAt: badge.earnedAt,
        metadata: badge.metadata,
      });
      return acc;
    }, {} as Record<string, any[]>);

    const totalBadges = badges.length;
    const recentBadges = badges.slice(0, 5);

    return {
      totalBadges,
      categoriesCount: Object.keys(badgesByCategory).length,
      badgesByCategory,
      recentBadges: recentBadges.map((badge) => ({
        badgeId: badge.id,
        name: badge.name,
        description: badge.description,
        category: badge.category,
        icon: badge.icon,
        earnedAt: badge.earnedAt,
      })),
    };
  }

  private async getNotifications(studentId: string) {
    const notifications = await this.prisma.notification.findMany({
      where: {
        userId: studentId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
    });

    const unreadCount = notifications.filter((n) => !n.isRead).length;

    return {
      total: notifications.length,
      unreadCount,
      notifications: notifications.map((notification) => ({
        id: notification.id,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        isRead: notification.isRead,
        readAt: notification.readAt,
        createdAt: notification.createdAt,
      })),
    };
  }
}

