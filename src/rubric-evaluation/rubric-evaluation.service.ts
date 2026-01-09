import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { EvaluateRubricDto } from './dto/evaluate-rubric.dto';
import { UpdateRubricEvaluationDto } from './dto/update-rubric-evaluation.dto';

@Injectable()
export class RubricEvaluationService {
  private readonly logger = new Logger(RubricEvaluationService.name);

  constructor(private prisma: PrismaService) {}

  async evaluateRubric(
    submissionId: string,
    evaluateDto: EvaluateRubricDto,
    evaluatorId: string,
  ) {
    return this.prisma.executeTransaction(async (tx) => {
      // Get submission with project and template
      const submission = await tx.projectSubmission.findUnique({
        where: { id: submissionId, deletedAt: null },
        include: {
          project: {
            include: {
              template: {
                select: {
                  id: true,
                  title: true,
                  rubric: true,
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

      // Verify evaluator is a teacher
      const evaluator = await tx.user.findUnique({
        where: { id: evaluatorId },
        include: {
          roles: {
            include: {
              role: true,
            },
          },
        },
      });

      if (!evaluator) {
        throw new NotFoundException('Evaluator not found');
      }

      const isTeacher = evaluator.roles.some((ur) => ur.role.name === 'Teacher');
      if (!isTeacher) {
        throw new ForbiddenException('Only teachers can evaluate rubrics');
      }

      // Get rubric from project template
      const rubric = submission.project.template?.rubric;
      if (!rubric) {
        throw new BadRequestException('Project template does not have a rubric defined');
      }

      // Validate rubric structure
      this.validateRubricStructure(rubric);

      // Validate scores against rubric criteria if provided
      if (evaluateDto.scores) {
        this.validateScoresAgainstRubric(rubric, evaluateDto.scores);
      }

      // Check if evaluation already exists
      const existingEvaluation = await tx.rubricEvaluation.findUnique({
        where: { submissionId },
      });

      if (existingEvaluation) {
        throw new BadRequestException('Rubric evaluation already exists for this submission. Use update instead.');
      }

      // Create rubric evaluation
      const evaluation = await tx.rubricEvaluation.create({
        data: {
          submissionId,
          rubric: rubric as any,
          scores: evaluateDto.scores || null,
          comments: this.extractComments(evaluateDto.scores),
          overallScore: evaluateDto.overallScore ? evaluateDto.overallScore : null,
          overallComment: evaluateDto.overallComment || null,
          evaluatedBy: evaluatorId,
        },
        include: {
          submission: {
            select: {
              id: true,
              status: true,
              project: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          evaluator: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      this.logger.log(`Rubric evaluation created for submission ${submissionId} by ${evaluatorId}`);

      return evaluation;
    });
  }

  async updateRubricEvaluation(
    submissionId: string,
    updateDto: UpdateRubricEvaluationDto,
    evaluatorId: string,
  ) {
    return this.prisma.executeTransaction(async (tx) => {
      const evaluation = await tx.rubricEvaluation.findUnique({
        where: { submissionId },
        include: {
          submission: {
            include: {
              project: {
                include: {
                  template: {
                    select: {
                      rubric: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!evaluation) {
        throw new NotFoundException(`Rubric evaluation not found for submission ${submissionId}`);
      }

      // Verify evaluator is the same or has permission
      if (evaluation.evaluatedBy !== evaluatorId) {
        // Check if user is a teacher (can update other teachers' evaluations)
        const evaluator = await tx.user.findUnique({
          where: { id: evaluatorId },
          include: {
            roles: {
              include: {
                role: true,
              },
            },
          },
        });

        const isTeacher = evaluator?.roles.some((ur) => ur.role.name === 'Teacher');
        if (!isTeacher) {
          throw new ForbiddenException('You can only update your own rubric evaluations');
        }
      }

      // Validate scores if provided
      if (updateDto.scores && evaluation.rubric) {
        this.validateScoresAgainstRubric(evaluation.rubric as any, updateDto.scores);
      }

      // Merge scores and comments
      const existingScores = (evaluation.scores as any) || {};
      const newScores = updateDto.scores || {};
      const mergedScores = { ...existingScores, ...newScores };

      const existingComments = (evaluation.comments as any) || {};
      const newComments = this.extractComments(updateDto.scores);
      const mergedComments = { ...existingComments, ...newComments };

      return tx.rubricEvaluation.update({
        where: { id: evaluation.id },
        data: {
          scores: mergedScores,
          comments: mergedComments,
          overallScore: updateDto.overallScore !== undefined ? updateDto.overallScore : evaluation.overallScore,
          overallComment: updateDto.overallComment !== undefined ? updateDto.overallComment : evaluation.overallComment,
        },
        include: {
          submission: {
            select: {
              id: true,
              status: true,
            },
          },
          evaluator: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });
    });
  }

  async getRubricEvaluation(submissionId: string) {
    const evaluation = await this.prisma.rubricEvaluation.findUnique({
      where: { submissionId },
      include: {
        submission: {
          select: {
            id: true,
            status: true,
            project: {
              select: {
                id: true,
                name: true,
                template: {
                  select: {
                    id: true,
                    title: true,
                  },
                },
              },
            },
          },
        },
        evaluator: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!evaluation) {
      throw new NotFoundException(`Rubric evaluation not found for submission ${submissionId}`);
    }

    return evaluation;
  }

  async getRubricForSubmission(submissionId: string) {
    const submission = await this.prisma.projectSubmission.findUnique({
      where: { id: submissionId, deletedAt: null },
      include: {
        project: {
          include: {
            template: {
              select: {
                id: true,
                title: true,
                rubric: true,
              },
            },
          },
        },
        rubricEvaluation: {
          include: {
            evaluator: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    if (!submission) {
      throw new NotFoundException(`Submission with ID ${submissionId} not found`);
    }

    const rubric = submission.project.template?.rubric;

    if (!rubric) {
      throw new NotFoundException('Project template does not have a rubric defined');
    }

    return {
      rubric,
      evaluation: submission.rubricEvaluation,
      submission: {
        id: submission.id,
        status: submission.status,
        project: {
          id: submission.project.id,
          name: submission.project.name,
        },
      },
    };
  }

  private validateRubricStructure(rubric: any) {
    if (!rubric || typeof rubric !== 'object') {
      throw new BadRequestException('Invalid rubric structure: must be an object');
    }

    // Validate rubric has criteria array
    if (!Array.isArray(rubric.criteria)) {
      throw new BadRequestException('Invalid rubric structure: must have a criteria array');
    }

    // Validate each criterion
    rubric.criteria.forEach((criterion: any, index: number) => {
      if (!criterion.name) {
        throw new BadRequestException(`Criterion at index ${index} must have a name`);
      }

      if (criterion.maxPoints !== undefined && typeof criterion.maxPoints !== 'number') {
        throw new BadRequestException(`Criterion "${criterion.name}" maxPoints must be a number`);
      }
    });
  }

  private validateScoresAgainstRubric(rubric: any, scores: Record<string, { score?: number; comment?: string }>) {
    if (!rubric.criteria || !Array.isArray(rubric.criteria)) {
      return; // Skip validation if rubric structure is invalid (will be caught elsewhere)
    }

    const criterionNames = rubric.criteria.map((c: any) => c.name || c.id);
    const criterionIds = rubric.criteria.map((c: any) => c.id || c.name);

    // Check for unknown criteria
    for (const criterionKey of Object.keys(scores)) {
      if (!criterionNames.includes(criterionKey) && !criterionIds.includes(criterionKey)) {
        this.logger.warn(`Unknown criterion in scores: ${criterionKey}`);
        // Don't throw error, just log warning - allows flexibility
      }
    }

    // Validate scores are within maxPoints if specified
    for (const criterion of rubric.criteria) {
      const criterionKey = criterion.id || criterion.name;
      const scoreData = scores[criterionKey];

      if (scoreData?.score !== undefined) {
        const maxPoints = criterion.maxPoints || 100;
        if (scoreData.score < 0 || scoreData.score > maxPoints) {
          throw new BadRequestException(
            `Score for "${criterion.name}" must be between 0 and ${maxPoints}`,
          );
        }
      }
    }
  }

  private extractComments(scores?: Record<string, { score?: number; comment?: string }>): any {
    if (!scores) {
      return null;
    }

    const comments: Record<string, string> = {};

    for (const [criterionId, data] of Object.entries(scores)) {
      if (data.comment) {
        comments[criterionId] = data.comment;
      }
    }

    return Object.keys(comments).length > 0 ? comments : null;
  }

  async calculateOverallScore(submissionId: string): Promise<number | null> {
    const evaluation = await this.prisma.rubricEvaluation.findUnique({
      where: { submissionId },
      include: {
        submission: {
          include: {
            project: {
              include: {
                template: {
                  select: {
                    rubric: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!evaluation || !evaluation.scores) {
      return null;
    }

    const rubric = evaluation.submission.project.template?.rubric as any;
    if (!rubric || !rubric.criteria) {
      return null;
    }

    const scores = evaluation.scores as Record<string, { score?: number }>;
    let totalScore = 0;
    let totalMaxPoints = 0;

    for (const criterion of rubric.criteria) {
      const criterionKey = criterion.id || criterion.name;
      const scoreData = scores[criterionKey];

      if (scoreData?.score !== undefined) {
        const maxPoints = criterion.maxPoints || 100;
        totalScore += scoreData.score;
        totalMaxPoints += maxPoints;
      }
    }

    if (totalMaxPoints === 0) {
      return null;
    }

    // Calculate percentage
    const percentage = (totalScore / totalMaxPoints) * 100;
    return Math.round(percentage * 100) / 100; // Round to 2 decimal places
  }
}

