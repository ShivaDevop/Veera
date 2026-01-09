import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { UpdateSubmissionDto } from './dto/update-submission.dto';
import { SubmitSubmissionDto } from './dto/submit-submission.dto';
import { MediaService } from './media.service';

@Injectable()
export class SubmissionsService {
  constructor(
    private prisma: PrismaService,
    private mediaService: MediaService,
  ) {}

  async createDraft(createDto: CreateSubmissionDto, studentId: string) {
    // Verify project exists
    const project = await this.prisma.project.findUnique({
      where: { id: createDto.projectId, deletedAt: null },
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${createDto.projectId} not found`);
    }

    // Check if assignment exists (if provided)
    if (createDto.assignmentId) {
      const assignment = await this.prisma.projectAssignment.findUnique({
        where: {
          id: createDto.assignmentId,
          studentId,
          projectId: createDto.projectId,
        },
      });

      if (!assignment) {
        throw new NotFoundException('Assignment not found or does not belong to student');
      }
    }

    // Check if draft already exists
    const existingDraft = await this.prisma.projectSubmission.findFirst({
      where: {
        projectId: createDto.projectId,
        studentId,
        status: 'draft',
        deletedAt: null,
      },
    });

    if (existingDraft) {
      throw new BadRequestException('Draft submission already exists for this project');
    }

    return this.prisma.projectSubmission.create({
      data: {
        projectId: createDto.projectId,
        studentId,
        assignmentId: createDto.assignmentId,
        status: 'draft',
        submittedData: createDto.submittedData || null,
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
        media: true,
      },
    });
  }

  async getMySubmission(submissionId: string, studentId: string) {
    const submission = await this.prisma.projectSubmission.findUnique({
      where: { id: submissionId, deletedAt: null },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            description: true,
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
      },
    });

    if (!submission) {
      throw new NotFoundException(`Submission with ID ${submissionId} not found`);
    }

    if (submission.studentId !== studentId) {
      throw new ForbiddenException('You can only access your own submissions');
    }

    // Generate access URLs for media files
    const mediaWithUrls = await Promise.all(
      submission.media.map(async (media) => {
        try {
          const accessUrl = await this.mediaService.generateAccessUrl(media.blobPath, 60);
          return {
            ...media,
            accessUrl,
          };
        } catch {
          return {
            ...media,
            accessUrl: null,
          };
        }
      }),
    );

    return {
      ...submission,
      media: mediaWithUrls,
    };
  }

  async getMySubmissions(studentId: string, projectId?: string) {
    const where: any = {
      studentId,
      deletedAt: null,
    };

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
        assignment: {
          select: {
            id: true,
            dueDate: true,
            status: true,
          },
        },
        _count: {
          select: {
            media: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async updateDraft(
    submissionId: string,
    updateDto: UpdateSubmissionDto,
    studentId: string,
  ) {
    const submission = await this.prisma.projectSubmission.findUnique({
      where: { id: submissionId, deletedAt: null },
    });

    if (!submission) {
      throw new NotFoundException(`Submission with ID ${submissionId} not found`);
    }

    if (submission.studentId !== studentId) {
      throw new ForbiddenException('You can only update your own submissions');
    }

    if (submission.status !== 'draft') {
      throw new BadRequestException('Only draft submissions can be updated');
    }

    return this.prisma.projectSubmission.update({
      where: { id: submissionId },
      data: {
        submittedData: updateDto.submittedData !== undefined ? updateDto.submittedData : undefined,
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
        media: true,
      },
    });
  }

  async submit(submissionId: string, submitDto: SubmitSubmissionDto, studentId: string) {
    const submission = await this.prisma.projectSubmission.findUnique({
      where: { id: submissionId, deletedAt: null },
      include: {
        media: true,
      },
    });

    if (!submission) {
      throw new NotFoundException(`Submission with ID ${submissionId} not found`);
    }

    if (submission.studentId !== studentId) {
      throw new ForbiddenException('You can only submit your own submissions');
    }

    if (submission.status !== 'draft') {
      throw new BadRequestException('Only draft submissions can be submitted');
    }

    // Check if assignment has due date and if it's past due
    if (submission.assignmentId) {
      const assignment = await this.prisma.projectAssignment.findUnique({
        where: { id: submission.assignmentId },
      });

      if (assignment?.dueDate && new Date(assignment.dueDate) < new Date()) {
        // Allow submission but mark as late
        // You can add a 'isLate' flag if needed
      }
    }

    // Update submission status
    return this.prisma.projectSubmission.update({
      where: { id: submissionId },
      data: {
        status: 'submitted',
        submittedAt: new Date(),
        submittedData: submitDto.submittedData !== undefined ? submitDto.submittedData : submission.submittedData,
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            description: true,
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
      },
    });
  }

  async deleteDraft(submissionId: string, studentId: string) {
    const submission = await this.prisma.projectSubmission.findUnique({
      where: { id: submissionId, deletedAt: null },
      include: {
        media: true,
      },
    });

    if (!submission) {
      throw new NotFoundException(`Submission with ID ${submissionId} not found`);
    }

    if (submission.studentId !== studentId) {
      throw new ForbiddenException('You can only delete your own submissions');
    }

    if (submission.status !== 'draft') {
      throw new BadRequestException('Only draft submissions can be deleted');
    }

    // Delete associated media files
    for (const media of submission.media) {
      try {
        await this.mediaService.deleteFile(media.id);
      } catch (error) {
        // Log error but continue deletion
        console.error(`Failed to delete media ${media.id}:`, error);
      }
    }

    return this.prisma.projectSubmission.update({
      where: { id: submissionId },
      data: { deletedAt: new Date() },
    });
  }

  async uploadMedia(
    submissionId: string,
    file: Express.Multer.File,
    studentId: string,
  ) {
    const submission = await this.prisma.projectSubmission.findUnique({
      where: { id: submissionId, deletedAt: null },
    });

    if (!submission) {
      throw new NotFoundException(`Submission with ID ${submissionId} not found`);
    }

    if (submission.studentId !== studentId) {
      throw new ForbiddenException('You can only upload media to your own submissions');
    }

    if (submission.status !== 'draft') {
      throw new BadRequestException('Media can only be uploaded to draft submissions');
    }

    return this.mediaService.uploadFile(file, submissionId);
  }

  async deleteMedia(mediaId: string, studentId: string) {
    const media = await this.prisma.submissionMedia.findUnique({
      where: { id: mediaId },
      include: {
        submission: true,
      },
    });

    if (!media) {
      throw new NotFoundException('Media file not found');
    }

    if (media.submission.studentId !== studentId) {
      throw new ForbiddenException('You can only delete media from your own submissions');
    }

    if (media.submission.status !== 'draft') {
      throw new BadRequestException('Media can only be deleted from draft submissions');
    }

    return this.mediaService.deleteFile(mediaId);
  }

  async generateUploadUrl(
    submissionId: string,
    fileName: string,
    mimeType: string,
    studentId: string,
  ) {
    const submission = await this.prisma.projectSubmission.findUnique({
      where: { id: submissionId, deletedAt: null },
    });

    if (!submission) {
      throw new NotFoundException(`Submission with ID ${submissionId} not found`);
    }

    if (submission.studentId !== studentId) {
      throw new ForbiddenException('You can only generate upload URLs for your own submissions');
    }

    if (submission.status !== 'draft') {
      throw new BadRequestException('Upload URLs can only be generated for draft submissions');
    }

    return this.mediaService.generateUploadUrl(submissionId, fileName, mimeType);
  }
}

