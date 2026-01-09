import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateSchoolDto } from './dto/create-school.dto';
import { UpdateSchoolDto } from './dto/update-school.dto';

@Injectable()
export class SchoolsService {
  constructor(private prisma: PrismaService) {}

  async create(createSchoolDto: CreateSchoolDto) {
    const existingSchool = await this.prisma.school.findUnique({
      where: { code: createSchoolDto.code },
    });

    if (existingSchool) {
      throw new ConflictException('School with this code already exists');
    }

    return this.prisma.school.create({
      data: createSchoolDto,
    });
  }

  async findAll() {
    return this.prisma.school.findMany({
      where: { deletedAt: null },
      include: {
        _count: {
          select: { classes: true },
        },
      },
    });
  }

  async findOne(id: string) {
    const school = await this.prisma.school.findUnique({
      where: { id },
      include: {
        classes: {
          where: { deletedAt: null },
        },
      },
    });

    if (!school) {
      throw new NotFoundException(`School with ID ${id} not found`);
    }

    return school;
  }

  async update(id: string, updateSchoolDto: UpdateSchoolDto) {
    await this.findOne(id);

    if (updateSchoolDto.code) {
      const existingSchool = await this.prisma.school.findUnique({
        where: { code: updateSchoolDto.code },
      });
      if (existingSchool && existingSchool.id !== id) {
        throw new ConflictException('School with this code already exists');
      }
    }

    return this.prisma.school.update({
      where: { id },
      data: updateSchoolDto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.school.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}

