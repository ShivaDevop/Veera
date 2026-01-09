import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';

@Injectable()
export class ClassesService {
  constructor(private prisma: PrismaService) {}

  async create(createClassDto: CreateClassDto) {
    const school = await this.prisma.school.findUnique({
      where: { id: createClassDto.schoolId },
    });

    if (!school) {
      throw new NotFoundException(`School with ID ${createClassDto.schoolId} not found`);
    }

    const existingClass = await this.prisma.class.findUnique({
      where: {
        schoolId_code: {
          schoolId: createClassDto.schoolId,
          code: createClassDto.code,
        },
      },
    });

    if (existingClass) {
      throw new ConflictException('Class with this code already exists in this school');
    }

    return this.prisma.class.create({
      data: createClassDto,
    });
  }

  async findAll(schoolId?: string) {
    const where: any = { deletedAt: null };
    if (schoolId) {
      where.schoolId = schoolId;
    }

    return this.prisma.class.findMany({
      where,
      include: {
        school: true,
      },
    });
  }

  async findOne(id: string) {
    const classEntity = await this.prisma.class.findUnique({
      where: { id },
      include: {
        school: true,
      },
    });

    if (!classEntity) {
      throw new NotFoundException(`Class with ID ${id} not found`);
    }

    return classEntity;
  }

  async update(id: string, updateClassDto: UpdateClassDto) {
    await this.findOne(id);

    if (updateClassDto.code) {
      const classEntity = await this.prisma.class.findUnique({ where: { id } });
      const existingClass = await this.prisma.class.findUnique({
        where: {
          schoolId_code: {
            schoolId: classEntity.schoolId,
            code: updateClassDto.code,
          },
        },
      });
      if (existingClass && existingClass.id !== id) {
        throw new ConflictException('Class with this code already exists in this school');
      }
    }

    return this.prisma.class.update({
      where: { id },
      data: updateClassDto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.class.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}

