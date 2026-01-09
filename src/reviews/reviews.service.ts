import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { ApproveSubmissionDto } from './dto/approve-submission.dto';
import { RejectSubmissionDto } from './dto/reject-submission.dto';
import { AddCommentDto } from './dto/add-comment.dto';
import { TwilioNotificationService } from '../twilio/twilio-notification.service';

@Injectable()
export class ReviewsService {
  private readonly logger = new Logger(ReviewsService.name);

  constructor(
    private prisma: PrismaService,
    private twilioNotificationService?: TwilioNotificationService,
  ) {}

  async approveSubmission(
    submissionId: string,
    approveDto: ApproveSubmissionDto,
    reviewerId: string,
  ) {
      return this.prisma.executeTransaction(async (tx) => {
      // Get submission with related data
      const submission = await tx.projectSubmission.findUnique({
        where: { id: submissionId, deletedAt: null },
        include: {
          project: {
            include: {
              template: {
                include: {
                  skills: {
                    include: {
                      skill: true,
                    },
                  },
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
        },
      });

      if (!submission) {
        throw new NotFoundException(`Submission with ID ${submissionId} not found`);
      }

      if (submission.status !== 'submitted' && submission.status !== 'under_review') {
        throw new BadRequestException(
          `Cannot approve submission with status: ${submission.status}. Only 'submitted' or 'under_review' submissions can be approved.`,
        );
      }

      // Verify reviewer is a teacher
      const reviewer = await tx.user.findUnique({
        where: { id: reviewerId },
        include: {
          roles: {
            include: {
              role: true,
            },
          },
        },
      });

      if (!reviewer) {
        throw new NotFoundException('Reviewer not found');
      }

      const isTeacher = reviewer.roles.some((ur) => ur.role.name === 'Teacher');
      if (!isTeacher) {
        throw new ForbiddenException('Only teachers can approve submissions');
      }

      // Update submission status
      const updatedSubmission = await tx.projectSubmission.update({
        where: { id: submissionId },
        data: {
          status: 'approved',
          reviewedBy: reviewerId,
          reviewedAt: new Date(),
          reviewStatus: 'approved',
          reviewComment: approveDto.comment || null,
          grade: approveDto.grade ? approveDto.grade : submission.grade,
          feedback: approveDto.comment || submission.feedback,
        },
      });

      // Generate skills from project template if template exists
      if (submission.project.template?.skills && submission.project.template.skills.length > 0) {
        const skillsCreated = [];

        for (const templateSkill of submission.project.template.skills) {
          try {
            // Check if student already has this skill
            const existingSkill = await tx.studentSkill.findUnique({
              where: {
                studentId_skillId: {
                  studentId: submission.studentId,
                  skillId: templateSkill.skillId,
                },
              },
            });

            if (existingSkill) {
              // Update existing skill (increase level/progress if needed)
              const newLevel = Math.min(
                existingSkill.level + 1,
                templateSkill.requiredLevel || existingSkill.level + 1,
              );
              const newProgress = Math.min(Number(existingSkill.progress) + 25, 100);

              await tx.studentSkill.update({
                where: { id: existingSkill.id },
                data: {
                  level: newLevel,
                  progress: newProgress,
                  lastUpdated: new Date(),
                },
              });

              skillsCreated.push({
                skillId: templateSkill.skillId,
                skillName: templateSkill.skill.name,
                action: 'updated',
              });
            } else {
              // Create new skill
              const initialLevel = templateSkill.requiredLevel || 1;
              const initialProgress = 0;

              await tx.studentSkill.create({
                data: {
                  studentId: submission.studentId,
                  skillId: templateSkill.skillId,
                  level: initialLevel,
                  progress: initialProgress,
                  projectId: submission.projectId,
                  submissionId: submission.id,
                  endorsedBy: reviewerId,
                  endorsementDate: new Date(),
                  lastUpdated: new Date(),
                },
              });

              skillsCreated.push({
                skillId: templateSkill.skillId,
                skillName: templateSkill.skill.name,
                action: 'created',
                level: initialLevel,
              });

              // Send Twilio notification for skill earned (only for newly created skills)
              if (this.twilioNotificationService) {
                try {
                  await this.twilioNotificationService.sendSkillEarned(
                    submission.studentId,
                    templateSkill.skill.name,
                  );
                } catch (error) {
                  this.logger.error(`Failed to send Twilio notification for skill earned: ${error}`);
                  // Don't fail the transaction if notification fails
                }
              }
            }
          } catch (error) {
            this.logger.error(
              `Failed to create/update skill ${templateSkill.skillId} for student ${submission.studentId}`,
              error,
            );
            // Continue with other skills even if one fails
          }
        }

        this.logger.log(
          `Approved submission ${submissionId} and created/updated ${skillsCreated.length} skills`,
        );

        // Send Twilio notification for project approval
        if (this.twilioNotificationService) {
          try {
            await this.twilioNotificationService.sendProjectApproval(
              submission.studentId,
              submission.project.name,
            );
          } catch (error) {
            this.logger.error(`Failed to send Twilio notification for project approval: ${error}`);
            // Don't fail the request if notification fails
          }
        }

        return {
          ...updatedSubmission,
          skillsGenerated: skillsCreated,
        };
      }

      return updatedSubmission;
    });
  }

  async rejectSubmission(
    submissionId: string,
    rejectDto: RejectSubmissionDto,
    reviewerId: string,
  ) {
      return this.prisma.executeTransaction(async (tx) => {
      // Get submission
      const submission = await tx.projectSubmission.findUnique({
        where: { id: submissionId, deletedAt: null },
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
      });

      if (!submission) {
        throw new NotFoundException(`Submission with ID ${submissionId} not found`);
      }

      if (submission.status !== 'submitted' && submission.status !== 'under_review') {
        throw new BadRequestException(
          `Cannot reject submission with status: ${submission.status}. Only 'submitted' or 'under_review' submissions can be rejected.`,
        );
      }

      // Verify reviewer is a teacher
      const reviewer = await tx.user.findUnique({
        where: { id: reviewerId },
        include: {
          roles: {
            include: {
              role: true,
            },
          },
        },
      });

      if (!reviewer) {
        throw new NotFoundException('Reviewer not found');
      }

      const isTeacher = reviewer.roles.some((ur) => ur.role.name === 'Teacher');
      if (!isTeacher) {
        throw new ForbiddenException('Only teachers can reject submissions');
      }

      // Validate comment is provided (mandatory on rejection)
      if (!rejectDto.comment || rejectDto.comment.trim().length === 0) {
        throw new BadRequestException('Rejection comment is mandatory');
      }

      // Update submission status
      return tx.projectSubmission.update({
        where: { id: submissionId },
        data: {
          status: 'rejected',
          reviewedBy: reviewerId,
          reviewedAt: new Date(),
          reviewStatus: 'rejected',
          reviewComment: rejectDto.comment,
          grade: rejectDto.grade || null,
          feedback: rejectDto.comment,
        },
      });
    });
  }

  async addComment(
    submissionId: string,
    commentDto: AddCommentDto,
    reviewerId: string,
  ) {
      return this.prisma.executeTransaction(async (tx) => {
      const submission = await tx.projectSubmission.findUnique({
        where: { id: submissionId, deletedAt: null },
      });

      if (!submission) {
        throw new NotFoundException(`Submission with ID ${submissionId} not found`);
      }

      // Verify reviewer is a teacher
      const reviewer = await tx.user.findUnique({
        where: { id: reviewerId },
        include: {
          roles: {
            include: {
              role: true,
            },
          },
        },
      });

      if (!reviewer) {
        throw new NotFoundException('Reviewer not found');
      }

      const isTeacher = reviewer.roles.some((ur) => ur.role.name === 'Teacher');
      if (!isTeacher) {
        throw new ForbiddenException('Only teachers can add comments');
      }

      // Update submission with comment (can be added at any review stage)
      const existingComment = submission.reviewComment
        ? `${submission.reviewComment}\n\n---\n${new Date().toISOString()}: ${commentDto.comment}`
        : commentDto.comment;

      return tx.projectSubmission.update({
        where: { id: submissionId },
        data: {
          reviewComment: existingComment,
          feedback: existingComment,
          reviewedBy: reviewerId,
          reviewedAt: new Date(),
        },
      });
    });
  }

  async getSubmissionForReview(submissionId: string, reviewerId: string) {
    const submission = await this.prisma.projectSubmission.findUnique({
      where: { id: submissionId, deletedAt: null },
      include: {
        project: {
          include: {
            template: {
              include: {
                skills: {
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
                },
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
        media: {
          orderBy: { uploadedAt: 'desc' },
        },
        reviewer: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!submission) {
      throw new NotFoundException(`Submission with ID ${submissionId} not found`);
    }

    // Verify reviewer is a teacher
    const reviewer = await this.prisma.user.findUnique({
      where: { id: reviewerId },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!reviewer) {
      throw new NotFoundException('Reviewer not found');
    }

    const isTeacher = reviewer.roles.some((ur) => ur.role.name === 'Teacher');
    if (!isTeacher) {
      throw new ForbiddenException('Only teachers can review submissions');
    }

    return submission;
  }

  async getSubmissionsForReview(
    reviewerId: string,
    status?: string,
    projectId?: string,
  ) {
    // Verify reviewer is a teacher
    const reviewer = await this.prisma.user.findUnique({
      where: { id: reviewerId },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!reviewer) {
      throw new NotFoundException('Reviewer not found');
    }

    const isTeacher = reviewer.roles.some((ur) => ur.role.name === 'Teacher');
    if (!isTeacher) {
      throw new ForbiddenException('Only teachers can review submissions');
    }

    const where: any = {
      deletedAt: null,
      status: {
        in: ['submitted', 'under_review', 'approved', 'rejected'],
      },
    };

    if (status) {
      where.status = status;
    }

    if (projectId) {
      where.projectId = projectId;
    }

    return this.prisma.projectSubmission.findMany({
      where,
      include: {
        project: {
          select: {
            id: true,
            name: true,
            description: true,
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
            studentSkills: true,
          },
        },
      },
      orderBy: { submittedAt: 'desc' },
    });
  }
}

