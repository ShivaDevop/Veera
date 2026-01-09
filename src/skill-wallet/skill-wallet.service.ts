import { Injectable, ForbiddenException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { RolesEnum } from '../common/enums/roles.enum';
import { TwilioNotificationService } from '../twilio/twilio-notification.service';

@Injectable()
export class SkillWalletService {
  private readonly logger = new Logger(SkillWalletService.name);

  constructor(
    private prisma: PrismaService,
    private twilioNotificationService?: TwilioNotificationService,
  ) {}

  async getMyWallet(userId: string, activeRole: RolesEnum): Promise<any> {
    if (activeRole !== RolesEnum.Student) {
      throw new ForbiddenException('Only students can access their own skill wallet');
    }

    const studentSkills = await this.prisma.studentSkill.findMany({
      where: {
        studentId: userId,
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
            status: true,
          },
        },
        submission: {
          select: {
            id: true,
            status: true,
            grade: true,
            submittedAt: true,
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

    return {
      studentId: userId,
      totalSkills: studentSkills.length,
      skills: studentSkills.map((ss) => ({
        id: ss.id,
        skill: {
          id: ss.skill.id,
          name: ss.skill.name,
          category: ss.skill.category,
          description: ss.skill.description,
        },
        level: ss.level,
        progress: Number(ss.progress),
        project: {
          id: ss.project.id,
          name: ss.project.name,
          status: ss.project.status,
        },
        submission: {
          id: ss.submission.id,
          status: ss.submission.status,
          grade: ss.submission.grade ? Number(ss.submission.grade) : null,
          submittedAt: ss.submission.submittedAt.toISOString(),
        },
        endorsedBy: {
          id: ss.endorser.id,
          email: ss.endorser.email,
          firstName: ss.endorser.firstName,
          lastName: ss.endorser.lastName,
        },
        endorsementDate: ss.endorsementDate.toISOString(),
        lastUpdated: ss.lastUpdated.toISOString(),
        createdAt: ss.createdAt.toISOString(),
      })),
    };
  }

  async getStudentWallet(
    viewerId: string,
    viewerRole: RolesEnum,
    studentId: string,
  ): Promise<any> {
    if (viewerRole === RolesEnum.Student && viewerId !== studentId) {
      throw new ForbiddenException('Students can only view their own skill wallet');
    }

    if (
      viewerRole === RolesEnum.Parent &&
      !(await this.isParentOfStudent(viewerId, studentId))
    ) {
      throw new ForbiddenException('You can only view your child\'s skill wallet');
    }

    const student = await this.prisma.user.findUnique({
      where: { id: studentId },
      select: { id: true, deletedAt: true },
    });

    if (!student || student.deletedAt) {
      throw new NotFoundException('Student not found');
    }

    return this.getMyWallet(studentId, RolesEnum.Student);
  }

  private async isParentOfStudent(parentId: string, studentId: string): Promise<boolean> {
    const consent = await this.prisma.parentConsent.findFirst({
      where: {
        parentId,
        studentId,
        status: 'approved',
        consentGiven: true,
      },
    });

    return !!consent;
  }
}
