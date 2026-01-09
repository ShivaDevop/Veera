import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateProjectTemplateDto } from './dto/create-project-template.dto';
import { UpdateProjectTemplateDto } from './dto/update-project-template.dto';
import { CreateProjectFromTemplateDto } from './dto/create-project-from-template.dto';

@Injectable()
export class ProjectTemplatesService {
  constructor(private prisma: PrismaService) {}

  // ==================== Template CRUD ====================

  async create(createTemplateDto: CreateProjectTemplateDto) {
    // Validate skill IDs if provided
    if (createTemplateDto.skillMappings && createTemplateDto.skillMappings.length > 0) {
      const skillIds = createTemplateDto.skillMappings.map((m) => m.skillId);
      const skills = await this.prisma.skill.findMany({
        where: {
          id: { in: skillIds },
          deletedAt: null,
        },
      });

      if (skills.length !== skillIds.length) {
        const foundIds = skills.map((s) => s.id);
        const missingIds = skillIds.filter((id) => !foundIds.includes(id));
        throw new BadRequestException(`Skills not found: ${missingIds.join(', ')}`);
      }
    }

    return this.prisma.projectTemplate.create({
      data: {
        title: createTemplateDto.title,
        description: createTemplateDto.description,
        category: createTemplateDto.category,
        rubric: createTemplateDto.rubric || null,
        skills: createTemplateDto.skillMappings
          ? {
              create: createTemplateDto.skillMappings.map((mapping) => ({
                skillId: mapping.skillId,
                requiredLevel: mapping.requiredLevel || null,
              })),
            }
          : undefined,
      },
      include: {
        skills: {
          include: {
            skill: true,
          },
        },
      },
    });
  }

  async findAll(category?: string, includeInactive = false) {
    const where: any = { deletedAt: null };
    if (category) {
      where.category = category;
    }
    if (!includeInactive) {
      where.isActive = true;
    }

    return this.prisma.projectTemplate.findMany({
      where,
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
        _count: {
          select: {
            projects: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const template = await this.prisma.projectTemplate.findUnique({
      where: { id, deletedAt: null },
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
        _count: {
          select: {
            projects: true,
          },
        },
      },
    });

    if (!template) {
      throw new NotFoundException(`Project template with ID ${id} not found`);
    }

    return template;
  }

  async update(id: string, updateTemplateDto: UpdateProjectTemplateDto) {
    const template = await this.findOne(id);

    // Validate skill IDs if provided
    if (updateTemplateDto.skillMappings && updateTemplateDto.skillMappings.length > 0) {
      const skillIds = updateTemplateDto.skillMappings.map((m) => m.skillId);
      const skills = await this.prisma.skill.findMany({
        where: {
          id: { in: skillIds },
          deletedAt: null,
        },
      });

      if (skills.length !== skillIds.length) {
        const foundIds = skills.map((s) => s.id);
        const missingIds = skillIds.filter((id) => !foundIds.includes(id));
        throw new BadRequestException(`Skills not found: ${missingIds.join(', ')}`);
      }
    }

    // Update template
    const updated = await this.prisma.projectTemplate.update({
      where: { id },
      data: {
        title: updateTemplateDto.title,
        description: updateTemplateDto.description,
        category: updateTemplateDto.category,
        rubric: updateTemplateDto.rubric !== undefined ? updateTemplateDto.rubric : undefined,
        isActive: updateTemplateDto.isActive,
      },
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
    });

    // Update skill mappings if provided
    if (updateTemplateDto.skillMappings !== undefined) {
      // Delete existing mappings
      await this.prisma.projectTemplateSkill.deleteMany({
        where: { templateId: id },
      });

      // Create new mappings
      if (updateTemplateDto.skillMappings.length > 0) {
        await this.prisma.projectTemplateSkill.createMany({
          data: updateTemplateDto.skillMappings.map((mapping) => ({
            templateId: id,
            skillId: mapping.skillId,
            requiredLevel: mapping.requiredLevel || null,
          })),
        });
      }

      // Reload with updated skills
      return this.findOne(id);
    }

    return updated;
  }

  async remove(id: string) {
    await this.findOne(id);

    // Check if template is being used by any projects
    const projectCount = await this.prisma.project.count({
      where: {
        templateId: id,
        deletedAt: null,
      },
    });

    if (projectCount > 0) {
      throw new ConflictException(
        `Cannot delete template: ${projectCount} project(s) are using this template`,
      );
    }

    return this.prisma.projectTemplate.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // ==================== Assignment APIs ====================

  async createProjectFromTemplate(
    createDto: CreateProjectFromTemplateDto,
    createdBy: string,
  ) {
    const template = await this.findOne(createDto.templateId);

    if (!template.isActive) {
      throw new BadRequestException('Cannot create project from inactive template');
    }

    // Validate student IDs if provided
    if (createDto.studentIds && createDto.studentIds.length > 0) {
      const students = await this.prisma.user.findMany({
        where: {
          id: { in: createDto.studentIds },
          deletedAt: null,
          isActive: true,
          roles: {
            some: {
              role: {
                name: 'Student',
              },
            },
          },
        },
      });

      if (students.length !== createDto.studentIds.length) {
        const foundIds = students.map((s) => s.id);
        const missingIds = createDto.studentIds.filter((id) => !foundIds.includes(id));
        throw new BadRequestException(`Students not found or inactive: ${missingIds.join(', ')}`);
      }
    }

    // Create project from template
    const project = await this.prisma.project.create({
      data: {
        name: createDto.name || template.title,
        description: template.description,
        templateId: template.id,
        status: 'draft',
        startDate: createDto.startDate ? new Date(createDto.startDate) : null,
        endDate: createDto.endDate ? new Date(createDto.endDate) : null,
      },
    });

    // Create assignments if student IDs provided
    if (createDto.studentIds && createDto.studentIds.length > 0) {
      const assignments = await this.prisma.projectAssignment.createMany({
        data: createDto.studentIds.map((studentId) => ({
          projectId: project.id,
          studentId,
          assignedBy: createdBy,
          dueDate: createDto.dueDate ? new Date(createDto.dueDate) : null,
          status: 'assigned',
        })),
      });
    }

    return this.prisma.project.findUnique({
      where: { id: project.id },
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
        assignments: {
          include: {
            student: {
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
  }

  async getTemplateUsageStats(templateId: string) {
    const template = await this.findOne(templateId);

    const stats = await this.prisma.project.groupBy({
      by: ['status'],
      where: {
        templateId,
        deletedAt: null,
      },
      _count: {
        id: true,
      },
    });

    const totalProjects = await this.prisma.project.count({
      where: {
        templateId,
        deletedAt: null,
      },
    });

    const totalAssignments = await this.prisma.projectAssignment.count({
      where: {
        project: {
          templateId,
          deletedAt: null,
        },
      },
    });

    return {
      templateId,
      templateTitle: template.title,
      totalProjects,
      totalAssignments,
      projectsByStatus: stats.reduce((acc, stat) => {
        acc[stat.status] = stat._count.id;
        return acc;
      }, {} as Record<string, number>),
    };
  }
}

