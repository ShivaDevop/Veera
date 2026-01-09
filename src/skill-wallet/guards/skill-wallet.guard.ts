import {
  Injectable,
  CanActivate,
  ExecutionContext,
  BadRequestException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../database/prisma.service';

/**
 * Guard to prevent manual skill creation
 * Ensures skills are only created through approved projects
 */
@Injectable()
export class SkillWalletGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const body = request.body;

    if (body.submissionId) {
      const submission = await this.prisma.projectSubmission.findUnique({
        where: { id: body.submissionId },
        include: {
          project: true,
        },
      });

      if (!submission) {
        throw new BadRequestException('Submission not found');
      }

      if (submission.status !== 'graded' || submission.grade === null) {
        throw new BadRequestException(
          'Skills can only be created from graded submissions',
        );
      }

      if (
        submission.project.status !== 'approved' &&
        submission.project.status !== 'completed'
      ) {
        throw new BadRequestException(
          'Skills can only be created from approved or completed projects',
        );
      }
    }

    return true;
  }
}

