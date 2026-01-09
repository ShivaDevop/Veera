import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateSkillDto } from './dto/create-skill.dto';
import { UpdateSkillDto } from './dto/update-skill.dto';

@Injectable()
export class SkillsService {
  constructor(private prisma: PrismaService) {}

  async create(createSkillDto: CreateSkillDto) {
    const existingSkill = await this.prisma.skill.findUnique({
      where: { name: createSkillDto.name },
    });

    if (existingSkill) {
      throw new ConflictException('Skill with this name already exists');
    }

    return this.prisma.skill.create({
      data: createSkillDto,
    });
  }

  async findAll(category?: string) {
    const where: any = { deletedAt: null };
    if (category) {
      where.category = category;
    }

    return this.prisma.skill.findMany({
      where,
    });
  }

  async findOne(id: string) {
    const skill = await this.prisma.skill.findUnique({
      where: { id },
    });

    if (!skill) {
      throw new NotFoundException(`Skill with ID ${id} not found`);
    }

    return skill;
  }

  async update(id: string, updateSkillDto: UpdateSkillDto) {
    await this.findOne(id);

    if (updateSkillDto.name) {
      const existingSkill = await this.prisma.skill.findUnique({
        where: { name: updateSkillDto.name },
      });
      if (existingSkill && existingSkill.id !== id) {
        throw new ConflictException('Skill with this name already exists');
      }
    }

    return this.prisma.skill.update({
      where: { id },
      data: updateSkillDto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.skill.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}

