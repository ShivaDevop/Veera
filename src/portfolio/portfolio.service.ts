import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreatePortfolioItemDto } from './dto/create-portfolio-item.dto';
import { UpdatePortfolioItemDto } from './dto/update-portfolio-item.dto';
import { UpdatePortfolioPrivacyDto } from './dto/update-portfolio-privacy.dto';
import { PortfolioFiltersDto } from './dto/portfolio-filters.dto';

@Injectable()
export class PortfolioService {
  private readonly logger = new Logger(PortfolioService.name);

  constructor(private prisma: PrismaService) {}

  async createPortfolioItem(createDto: CreatePortfolioItemDto, studentId: string) {
    // Verify submission exists and belongs to student
    const submission = await this.prisma.projectSubmission.findUnique({
      where: { id: createDto.submissionId, deletedAt: null },
      include: {
        project: {
          include: {
            template: true,
          },
        },
        student: true,
      },
    });

    if (!submission) {
      throw new NotFoundException(`Submission with ID ${createDto.submissionId} not found`);
    }

    if (submission.studentId !== studentId) {
      throw new ForbiddenException('You can only add your own submissions to portfolio');
    }

    // Only approved submissions can be added to portfolio
    if (submission.status !== 'approved') {
      throw new BadRequestException(
        'Only approved submissions can be added to portfolio. Current status: ' + submission.status,
      );
    }

    // Check if already in portfolio
    const existing = await this.prisma.portfolioItem.findUnique({
      where: { submissionId: createDto.submissionId },
    });

    if (existing) {
      throw new BadRequestException('This submission is already in the portfolio');
    }

    // Get category from project template or default
    const category = submission.project.template?.category || 'Web';

    // Get portfolio settings
    const settings = await this.getPortfolioSettings(studentId);

    // Create portfolio item
    return this.prisma.portfolioItem.create({
      data: {
        studentId,
        submissionId: createDto.submissionId,
        projectId: submission.projectId,
        title: createDto.title || submission.project.name,
        description: createDto.description || submission.project.description,
        category,
        featured: createDto.featured || false,
        showcaseOrder: createDto.showcaseOrder || null,
        parentConsent: settings.requireParentConsent ? false : true, // Auto-consent if not required
        schoolConsent: settings.requireSchoolConsent ? false : true, // Auto-consent if not required
        isPublic: false, // Never public by default
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
        submission: {
          select: {
            id: true,
            status: true,
            grade: true,
            reviewedAt: true,
          },
        },
      },
    });
  }

  async getPortfolioTimeline(
    studentId: string,
    filters?: PortfolioFiltersDto,
    viewerId?: string,
    viewerRole?: string,
  ) {
    // Privacy check
    const canView = await this.canViewPortfolio(studentId, viewerId, viewerRole);
    if (!canView) {
      throw new ForbiddenException('You do not have permission to view this portfolio');
    }

    const where: any = {
      studentId,
      deletedAt: null,
    };

    // Apply filters
    if (filters?.category) {
      where.category = filters.category;
    }

    if (filters?.projectId) {
      where.projectId = filters.projectId;
    }

    if (filters?.featured !== undefined) {
      where.featured = filters.featured;
    }

    // Privacy filters based on viewer
    if (viewerId !== studentId) {
      // Non-owner viewers see only items with required consents
      if (filters?.parentConsent !== undefined) {
        where.parentConsent = filters.parentConsent;
      } else {
        where.parentConsent = true; // Default: require parent consent for non-owners
      }

      if (filters?.schoolConsent !== undefined) {
        where.schoolConsent = filters.schoolConsent;
      } else {
        where.schoolConsent = true; // Default: require school consent for non-owners
      }
    }

    const items = await this.prisma.portfolioItem.findMany({
      where,
      include: {
        project: {
          select: {
            id: true,
            name: true,
            description: true,
            startDate: true,
            endDate: true,
          },
        },
        submission: {
          select: {
            id: true,
            status: true,
            grade: true,
            reviewedAt: true,
            submittedAt: true,
            _count: {
              select: {
                media: true,
              },
            },
          },
        },
      },
      orderBy: [
        { submission: { reviewedAt: 'desc' } }, // Timeline: most recent first
        { createdAt: 'desc' },
      ],
    });

    return {
      studentId,
      totalItems: items.length,
      items: items.map((item) => ({
        id: item.id,
        title: item.title,
        description: item.description,
        category: item.category,
        featured: item.featured,
        showcaseOrder: item.showcaseOrder,
        parentConsent: item.parentConsent,
        schoolConsent: item.schoolConsent,
        isPublic: item.isPublic,
        project: item.project,
        submission: {
          ...item.submission,
          grade: item.submission.grade ? Number(item.submission.grade) : null,
        },
        reviewedAt: item.submission.reviewedAt,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      })),
    };
  }

  async getPortfolioByCategory(
    studentId: string,
    category: string,
    viewerId?: string,
    viewerRole?: string,
  ) {
    const canView = await this.canViewPortfolio(studentId, viewerId, viewerRole);
    if (!canView) {
      throw new ForbiddenException('You do not have permission to view this portfolio');
    }

    const where: any = {
      studentId,
      category,
      deletedAt: null,
    };

    // Privacy filters for non-owners
    if (viewerId !== studentId) {
      where.parentConsent = true;
      where.schoolConsent = true;
    }

    return this.prisma.portfolioItem.findMany({
      where,
      include: {
        project: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
        submission: {
          select: {
            id: true,
            status: true,
            grade: true,
            reviewedAt: true,
          },
        },
      },
      orderBy: [
        { featured: 'desc' },
        { showcaseOrder: 'asc' },
        { createdAt: 'desc' },
      ],
    });
  }

  async updatePortfolioItem(
    itemId: string,
    updateDto: UpdatePortfolioItemDto,
    studentId: string,
  ) {
    const item = await this.prisma.portfolioItem.findUnique({
      where: { id: itemId, deletedAt: null },
    });

    if (!item) {
      throw new NotFoundException(`Portfolio item with ID ${itemId} not found`);
    }

    if (item.studentId !== studentId) {
      throw new ForbiddenException('You can only update your own portfolio items');
    }

    return this.prisma.portfolioItem.update({
      where: { id: itemId },
      data: {
        title: updateDto.title,
        description: updateDto.description,
        featured: updateDto.featured,
        showcaseOrder: updateDto.showcaseOrder,
        metadata: updateDto.metadata,
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
        submission: {
          select: {
            id: true,
            status: true,
            grade: true,
          },
        },
      },
    });
  }

  async updatePortfolioPrivacy(
    itemId: string,
    privacyDto: UpdatePortfolioPrivacyDto,
    studentId: string,
  ) {
    const item = await this.prisma.portfolioItem.findUnique({
      where: { id: itemId, deletedAt: null },
    });

    if (!item) {
      throw new NotFoundException(`Portfolio item with ID ${itemId} not found`);
    }

    if (item.studentId !== studentId) {
      throw new ForbiddenException('You can only update privacy settings for your own portfolio items');
    }

    // Get portfolio settings to check requirements
    const settings = await this.getPortfolioSettings(studentId);

    // Validate consents based on settings
    if (privacyDto.parentConsent !== undefined && settings.requireParentConsent) {
      // Parent consent is required by settings
    }

    if (privacyDto.schoolConsent !== undefined && settings.requireSchoolConsent) {
      // School consent is required by settings
    }

    return this.prisma.portfolioItem.update({
      where: { id: itemId },
      data: {
        parentConsent: privacyDto.parentConsent,
        schoolConsent: privacyDto.schoolConsent,
        // isPublic can only be true if both consents are true
        isPublic:
          (privacyDto.parentConsent ?? item.parentConsent) &&
          (privacyDto.schoolConsent ?? item.schoolConsent) &&
          settings.allowPublicShowcase,
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async removePortfolioItem(itemId: string, studentId: string) {
    const item = await this.prisma.portfolioItem.findUnique({
      where: { id: itemId, deletedAt: null },
    });

    if (!item) {
      throw new NotFoundException(`Portfolio item with ID ${itemId} not found`);
    }

    if (item.studentId !== studentId) {
      throw new ForbiddenException('You can only remove your own portfolio items');
    }

    return this.prisma.portfolioItem.update({
      where: { id: itemId },
      data: { deletedAt: new Date() },
    });
  }

  async getPortfolioSettings(studentId: string) {
    let settings = await this.prisma.portfolioSettings.findUnique({
      where: { studentId },
    });

    if (!settings) {
      // Get student's school for school-level settings
      const student = await this.prisma.user.findUnique({
        where: { id: studentId },
        include: {
          roles: {
            include: {
              role: {
                include: {
                  // This would need a relation to get school, but for now use defaults
                },
              },
            },
          },
        },
      });

      // Create default settings
      settings = await this.prisma.portfolioSettings.create({
        data: {
          studentId,
          allowPublicShowcase: false,
          requireParentConsent: true,
          requireSchoolConsent: true,
          autoAddApprovedProjects: false,
        },
      });
    }

    return settings;
  }

  async updatePortfolioSettings(studentId: string, settings: any) {
    const existing = await this.prisma.portfolioSettings.findUnique({
      where: { studentId },
    });

    if (existing) {
      return this.prisma.portfolioSettings.update({
        where: { studentId },
        data: settings,
      });
    }

    return this.prisma.portfolioSettings.create({
      data: {
        studentId,
        ...settings,
      },
    });
  }

  private async canViewPortfolio(
    studentId: string,
    viewerId?: string,
    viewerRole?: string,
  ): Promise<boolean> {
    // Student can always view their own portfolio
    if (viewerId === studentId) {
      return true;
    }

    // Teachers and admins can view
    if (viewerRole === 'Teacher' || viewerRole === 'SchoolAdmin' || viewerRole === 'PlatformAdmin') {
      return true;
    }

    // Parents can view if they have consent relationship
    if (viewerRole === 'Parent' && viewerId) {
      const consent = await this.prisma.parentConsent.findFirst({
        where: {
          parentId: viewerId,
          studentId,
          status: 'approved',
          consentGiven: true,
        },
      });

      return !!consent;
    }

    return false;
  }

  async autoAddApprovedProjects(studentId: string) {
    const settings = await this.getPortfolioSettings(studentId);

    if (!settings.autoAddApprovedProjects) {
      return { message: 'Auto-add is disabled', added: 0 };
    }

    // Find approved submissions not yet in portfolio
    const approvedSubmissions = await this.prisma.projectSubmission.findMany({
      where: {
        studentId,
        status: 'approved',
        deletedAt: null,
        portfolioItem: null, // Not already in portfolio
      },
      include: {
        project: {
          include: {
            template: true,
          },
        },
      },
    });

    let added = 0;

    for (const submission of approvedSubmissions) {
      try {
        const category = submission.project.template?.category || 'Web';

        await this.prisma.portfolioItem.create({
          data: {
            studentId,
            submissionId: submission.id,
            projectId: submission.projectId,
            title: submission.project.name,
            description: submission.project.description,
            category,
            parentConsent: settings.requireParentConsent ? false : true,
            schoolConsent: settings.requireSchoolConsent ? false : true,
            isPublic: false,
          },
        });

        added++;
      } catch (error) {
        this.logger.error(`Failed to auto-add submission ${submission.id} to portfolio`, error);
      }
    }

    return { message: `Auto-added ${added} approved projects`, added };
  }
}

