import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateCurriculumDto } from './dto/create-curriculum.dto';
import { UpdateCurriculumDto } from './dto/update-curriculum.dto';
import { CreateGradeDto } from './dto/create-grade.dto';
import { UpdateGradeDto } from './dto/update-grade.dto';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';
import { CreateChapterDto } from './dto/create-chapter.dto';
import { UpdateChapterDto } from './dto/update-chapter.dto';
import { CreateConceptDto } from './dto/create-concept.dto';
import { UpdateConceptDto } from './dto/update-concept.dto';
import { CreateSchoolCurriculumSelectionDto } from './dto/create-school-curriculum-selection.dto';
import { UpdateSchoolCurriculumSelectionDto } from './dto/update-school-curriculum-selection.dto';

@Injectable()
export class CurriculumService {
  constructor(private prisma: PrismaService) {}

  // ==================== Curriculum CRUD ====================

  async create(createCurriculumDto: CreateCurriculumDto) {
    // Check if curriculum with same name and version already exists
    const existing = await this.prisma.curriculum.findFirst({
      where: {
        name: createCurriculumDto.name,
        version: createCurriculumDto.version,
        deletedAt: null,
      },
    });

    if (existing) {
      throw new ConflictException(
        `Curriculum "${createCurriculumDto.name}" version "${createCurriculumDto.version}" already exists`,
      );
    }

    return this.prisma.curriculum.create({
      data: createCurriculumDto,
    });
  }

  async findAll(includeInactive = false) {
    return this.prisma.curriculum.findMany({
      where: includeInactive ? {} : { deletedAt: null, isActive: true },
      include: {
        grades: {
          where: { deletedAt: null },
          include: {
            subjects: {
              where: { deletedAt: null },
              include: {
                chapters: {
                  where: { deletedAt: null },
                  include: {
                    concepts: {
                      where: { deletedAt: null },
                      orderBy: { order: 'asc' },
                    },
                    orderBy: { order: 'asc' },
                  },
                  orderBy: { order: 'asc' },
                },
                orderBy: { order: 'asc' },
              },
              orderBy: { order: 'asc' },
            },
            orderBy: { level: 'asc' },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, includeHierarchy = true) {
    const curriculum = await this.prisma.curriculum.findUnique({
      where: { id, deletedAt: null },
      include: includeHierarchy
        ? {
            grades: {
              where: { deletedAt: null },
              include: {
                subjects: {
                  where: { deletedAt: null },
                  include: {
                    chapters: {
                      where: { deletedAt: null },
                      include: {
                        concepts: {
                          where: { deletedAt: null },
                          orderBy: { order: 'asc' },
                        },
                        orderBy: { order: 'asc' },
                      },
                      orderBy: { order: 'asc' },
                    },
                    orderBy: { order: 'asc' },
                  },
                  orderBy: { order: 'asc' },
                },
                orderBy: { level: 'asc' },
              },
            },
          }
        : undefined,
    });

    if (!curriculum) {
      throw new NotFoundException(`Curriculum with ID ${id} not found`);
    }

    return curriculum;
  }

  async update(id: string, updateCurriculumDto: UpdateCurriculumDto) {
    const curriculum = await this.findOne(id, false);

    // Check version uniqueness if version is being updated
    if (updateCurriculumDto.version && updateCurriculumDto.version !== curriculum.version) {
      const existing = await this.prisma.curriculum.findFirst({
        where: {
          name: curriculum.name,
          version: updateCurriculumDto.version,
          deletedAt: null,
          id: { not: id },
        },
      });

      if (existing) {
        throw new ConflictException(
          `Curriculum "${curriculum.name}" version "${updateCurriculumDto.version}" already exists`,
        );
      }
    }

    return this.prisma.curriculum.update({
      where: { id },
      data: updateCurriculumDto,
    });
  }

  async remove(id: string) {
    await this.findOne(id, false);

    return this.prisma.curriculum.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // ==================== Grade CRUD ====================

  async createGrade(createGradeDto: CreateGradeDto) {
    // Verify curriculum exists
    await this.findOne(createGradeDto.curriculumId, false);

    // Check if grade level already exists in this curriculum
    const existing = await this.prisma.grade.findFirst({
      where: {
        curriculumId: createGradeDto.curriculumId,
        level: createGradeDto.level,
        deletedAt: null,
      },
    });

    if (existing) {
      throw new ConflictException(
        `Grade level ${createGradeDto.level} already exists in this curriculum`,
      );
    }

    return this.prisma.grade.create({
      data: {
        ...createGradeDto,
        order: createGradeDto.order ?? 0,
      },
    });
  }

  async findAllGrades(curriculumId: string) {
    await this.findOne(curriculumId, false);

    return this.prisma.grade.findMany({
      where: {
        curriculumId,
        deletedAt: null,
      },
      include: {
        subjects: {
          where: { deletedAt: null },
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { level: 'asc' },
    });
  }

  async findOneGrade(id: string) {
    const grade = await this.prisma.grade.findUnique({
      where: { id, deletedAt: null },
      include: {
        curriculum: true,
        subjects: {
          where: { deletedAt: null },
          include: {
            chapters: {
              where: { deletedAt: null },
              include: {
                concepts: {
                  where: { deletedAt: null },
                  orderBy: { order: 'asc' },
                },
                orderBy: { order: 'asc' },
              },
              orderBy: { order: 'asc' },
            },
            orderBy: { order: 'asc' },
          },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!grade) {
      throw new NotFoundException(`Grade with ID ${id} not found`);
    }

    return grade;
  }

  async updateGrade(id: string, updateGradeDto: UpdateGradeDto) {
    const grade = await this.findOneGrade(id);

    // Check level uniqueness if level is being updated
    if (updateGradeDto.level && updateGradeDto.level !== grade.level) {
      const existing = await this.prisma.grade.findFirst({
        where: {
          curriculumId: grade.curriculumId,
          level: updateGradeDto.level,
          deletedAt: null,
          id: { not: id },
        },
      });

      if (existing) {
        throw new ConflictException(
          `Grade level ${updateGradeDto.level} already exists in this curriculum`,
        );
      }
    }

    return this.prisma.grade.update({
      where: { id },
      data: updateGradeDto,
    });
  }

  async removeGrade(id: string) {
    await this.findOneGrade(id);

    return this.prisma.grade.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // ==================== Subject CRUD ====================

  async createSubject(createSubjectDto: CreateSubjectDto) {
    // Verify grade exists
    const grade = await this.prisma.grade.findUnique({
      where: { id: createSubjectDto.gradeId, deletedAt: null },
    });

    if (!grade) {
      throw new NotFoundException(`Grade with ID ${createSubjectDto.gradeId} not found`);
    }

    // Check if subject code already exists in this grade
    if (createSubjectDto.code) {
      const existing = await this.prisma.subject.findFirst({
        where: {
          gradeId: createSubjectDto.gradeId,
          code: createSubjectDto.code,
          deletedAt: null,
        },
      });

      if (existing) {
        throw new ConflictException(
          `Subject with code "${createSubjectDto.code}" already exists in this grade`,
        );
      }
    }

    return this.prisma.subject.create({
      data: {
        ...createSubjectDto,
        order: createSubjectDto.order ?? 0,
      },
    });
  }

  async findAllSubjects(gradeId: string) {
    const grade = await this.prisma.grade.findUnique({
      where: { id: gradeId, deletedAt: null },
    });

    if (!grade) {
      throw new NotFoundException(`Grade with ID ${gradeId} not found`);
    }

    return this.prisma.subject.findMany({
      where: {
        gradeId,
        deletedAt: null,
      },
      include: {
        chapters: {
          where: { deletedAt: null },
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { order: 'asc' },
    });
  }

  async findOneSubject(id: string) {
    const subject = await this.prisma.subject.findUnique({
      where: { id, deletedAt: null },
      include: {
        grade: {
          include: {
            curriculum: true,
          },
        },
        chapters: {
          where: { deletedAt: null },
          include: {
            concepts: {
              where: { deletedAt: null },
              orderBy: { order: 'asc' },
            },
            orderBy: { order: 'asc' },
          },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!subject) {
      throw new NotFoundException(`Subject with ID ${id} not found`);
    }

    return subject;
  }

  async updateSubject(id: string, updateSubjectDto: UpdateSubjectDto) {
    const subject = await this.findOneSubject(id);

    // Check code uniqueness if code is being updated
    if (updateSubjectDto.code && updateSubjectDto.code !== subject.code) {
      const existing = await this.prisma.subject.findFirst({
        where: {
          gradeId: subject.gradeId,
          code: updateSubjectDto.code,
          deletedAt: null,
          id: { not: id },
        },
      });

      if (existing) {
        throw new ConflictException(
          `Subject with code "${updateSubjectDto.code}" already exists in this grade`,
        );
      }
    }

    return this.prisma.subject.update({
      where: { id },
      data: updateSubjectDto,
    });
  }

  async removeSubject(id: string) {
    await this.findOneSubject(id);

    return this.prisma.subject.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // ==================== Chapter CRUD ====================

  async createChapter(createChapterDto: CreateChapterDto) {
    // Verify subject exists
    const subject = await this.prisma.subject.findUnique({
      where: { id: createChapterDto.subjectId, deletedAt: null },
    });

    if (!subject) {
      throw new NotFoundException(`Subject with ID ${createChapterDto.subjectId} not found`);
    }

    return this.prisma.chapter.create({
      data: {
        ...createChapterDto,
        order: createChapterDto.order ?? 0,
      },
    });
  }

  async findAllChapters(subjectId: string) {
    const subject = await this.prisma.subject.findUnique({
      where: { id: subjectId, deletedAt: null },
    });

    if (!subject) {
      throw new NotFoundException(`Subject with ID ${subjectId} not found`);
    }

    return this.prisma.chapter.findMany({
      where: {
        subjectId,
        deletedAt: null,
      },
      include: {
        concepts: {
          where: { deletedAt: null },
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { order: 'asc' },
    });
  }

  async findOneChapter(id: string) {
    const chapter = await this.prisma.chapter.findUnique({
      where: { id, deletedAt: null },
      include: {
        subject: {
          include: {
            grade: {
              include: {
                curriculum: true,
              },
            },
          },
        },
        concepts: {
          where: { deletedAt: null },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!chapter) {
      throw new NotFoundException(`Chapter with ID ${id} not found`);
    }

    return chapter;
  }

  async updateChapter(id: string, updateChapterDto: UpdateChapterDto) {
    await this.findOneChapter(id);

    return this.prisma.chapter.update({
      where: { id },
      data: updateChapterDto,
    });
  }

  async removeChapter(id: string) {
    await this.findOneChapter(id);

    return this.prisma.chapter.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // ==================== Concept CRUD ====================

  async createConcept(createConceptDto: CreateConceptDto) {
    // Verify chapter exists
    const chapter = await this.prisma.chapter.findUnique({
      where: { id: createConceptDto.chapterId, deletedAt: null },
    });

    if (!chapter) {
      throw new NotFoundException(`Chapter with ID ${createConceptDto.chapterId} not found`);
    }

    return this.prisma.concept.create({
      data: {
        ...createConceptDto,
        learningObjectives: createConceptDto.learningObjectives || null,
        order: createConceptDto.order ?? 0,
      },
    });
  }

  async findAllConcepts(chapterId: string) {
    const chapter = await this.prisma.chapter.findUnique({
      where: { id: chapterId, deletedAt: null },
    });

    if (!chapter) {
      throw new NotFoundException(`Chapter with ID ${chapterId} not found`);
    }

    return this.prisma.concept.findMany({
      where: {
        chapterId,
        deletedAt: null,
      },
      orderBy: { order: 'asc' },
    });
  }

  async findOneConcept(id: string) {
    const concept = await this.prisma.concept.findUnique({
      where: { id, deletedAt: null },
      include: {
        chapter: {
          include: {
            subject: {
              include: {
                grade: {
                  include: {
                    curriculum: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!concept) {
      throw new NotFoundException(`Concept with ID ${id} not found`);
    }

    return concept;
  }

  async updateConcept(id: string, updateConceptDto: UpdateConceptDto) {
    await this.findOneConcept(id);

    return this.prisma.concept.update({
      where: { id },
      data: {
        ...updateConceptDto,
        learningObjectives: updateConceptDto.learningObjectives || undefined,
      },
    });
  }

  async removeConcept(id: string) {
    await this.findOneConcept(id);

    return this.prisma.concept.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // ==================== School Curriculum Selection ====================

  async createSchoolSelection(
    createSelectionDto: CreateSchoolCurriculumSelectionDto,
    selectedBy: string,
  ) {
    // Verify school exists
    const school = await this.prisma.school.findUnique({
      where: { id: createSelectionDto.schoolId, deletedAt: null },
    });

    if (!school) {
      throw new NotFoundException(`School with ID ${createSelectionDto.schoolId} not found`);
    }

    // Verify curriculum exists
    await this.findOne(createSelectionDto.curriculumId, false);

    // Check if selection already exists
    const existing = await this.prisma.schoolCurriculumSelection.findFirst({
      where: {
        schoolId: createSelectionDto.schoolId,
        curriculumId: createSelectionDto.curriculumId,
        deletedAt: null,
      },
    });

    if (existing) {
      throw new ConflictException(
        'This curriculum is already selected for this school. Use update instead.',
      );
    }

    return this.prisma.schoolCurriculumSelection.create({
      data: {
        ...createSelectionDto,
        selectedBy,
        isActive: createSelectionDto.isActive ?? true,
      },
    });
  }

  async findAllSchoolSelections(schoolId?: string) {
    return this.prisma.schoolCurriculumSelection.findMany({
      where: {
        ...(schoolId ? { schoolId, deletedAt: null } : { deletedAt: null }),
        isActive: true,
      },
      include: {
        school: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        curriculum: {
          select: {
            id: true,
            name: true,
            version: true,
            description: true,
          },
        },
      },
      orderBy: { selectedAt: 'desc' },
    });
  }

  async findOneSchoolSelection(id: string) {
    const selection = await this.prisma.schoolCurriculumSelection.findUnique({
      where: { id, deletedAt: null },
      include: {
        school: true,
        curriculum: true,
      },
    });

    if (!selection) {
      throw new NotFoundException(`School curriculum selection with ID ${id} not found`);
    }

    return selection;
  }

  async updateSchoolSelection(
    id: string,
    updateSelectionDto: UpdateSchoolCurriculumSelectionDto,
  ) {
    await this.findOneSchoolSelection(id);

    return this.prisma.schoolCurriculumSelection.update({
      where: { id },
      data: updateSelectionDto,
    });
  }

  async removeSchoolSelection(id: string) {
    await this.findOneSchoolSelection(id);

    return this.prisma.schoolCurriculumSelection.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async getSchoolActiveCurriculum(schoolId: string) {
    const selection = await this.prisma.schoolCurriculumSelection.findFirst({
      where: {
        schoolId,
        isActive: true,
        deletedAt: null,
      },
      include: {
        curriculum: {
          include: {
            grades: {
              where: { deletedAt: null },
              include: {
                subjects: {
                  where: { deletedAt: null },
                  include: {
                    chapters: {
                      where: { deletedAt: null },
                      include: {
                        concepts: {
                          where: { deletedAt: null },
                          orderBy: { order: 'asc' },
                        },
                        orderBy: { order: 'asc' },
                      },
                      orderBy: { order: 'asc' },
                    },
                    orderBy: { order: 'asc' },
                  },
                  orderBy: { order: 'asc' },
                },
                orderBy: { level: 'asc' },
              },
            },
          },
        },
      },
      orderBy: { selectedAt: 'desc' },
    });

    if (!selection) {
      throw new NotFoundException(`No active curriculum found for school ${schoolId}`);
    }

    return selection.curriculum;
  }
}
