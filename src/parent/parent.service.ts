import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateParentDto } from './dto/create-parent.dto';
import { UpdateParentDto } from './dto/update-parent.dto';

@Injectable()
export class ParentService {
  constructor(private prisma: PrismaService) {}

  async create(createParentDto: CreateParentDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: createParentDto.userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${createParentDto.userId} not found`);
    }

    const existingParent = await this.prisma.parent.findUnique({
      where: { userId: createParentDto.userId },
    });

    if (existingParent) {
      throw new ConflictException('Parent profile already exists for this user');
    }

    return this.prisma.parent.create({
      data: createParentDto,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  async findAll() {
    return this.prisma.parent.findMany({
      where: { deletedAt: null },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  async findOne(id: string) {
    const parent = await this.prisma.parent.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!parent) {
      throw new NotFoundException(`Parent with ID ${id} not found`);
    }

    return parent;
  }

  async findByUserId(userId: string) {
    const parent = await this.prisma.parent.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!parent) {
      throw new NotFoundException(`Parent profile not found for user ${userId}`);
    }

    return parent;
  }

  async update(id: string, updateParentDto: UpdateParentDto) {
    await this.findOne(id);

    return this.prisma.parent.update({
      where: { id },
      data: updateParentDto,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.parent.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}

