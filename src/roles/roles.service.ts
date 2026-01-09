import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class RolesService {
  constructor(private prisma: PrismaService) {}

  async create(createRoleDto: CreateRoleDto) {
    const existingRole = await this.prisma.role.findUnique({
      where: { name: createRoleDto.name },
    });

    if (existingRole) {
      throw new ConflictException('Role with this name already exists');
    }

    return this.prisma.role.create({
      data: {
        name: createRoleDto.name,
        description: createRoleDto.description,
        permissions: createRoleDto.permissions || [],
      },
    });
  }

  async findAll() {
    return this.prisma.role.findMany({
      where: { deletedAt: null },
    });
  }

  async findOne(id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
    });

    if (!role) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }

    return role;
  }

  async update(id: string, updateRoleDto: UpdateRoleDto) {
    await this.findOne(id);

    const updateData: any = {};
    if (updateRoleDto.name !== undefined) {
      const existingRole = await this.prisma.role.findUnique({
        where: { name: updateRoleDto.name },
      });
      if (existingRole && existingRole.id !== id) {
        throw new ConflictException('Role with this name already exists');
      }
      updateData.name = updateRoleDto.name;
    }
    if (updateRoleDto.description !== undefined) updateData.description = updateRoleDto.description;
    if (updateRoleDto.permissions !== undefined) updateData.permissions = updateRoleDto.permissions;
    if (updateRoleDto.isActive !== undefined) updateData.isActive = updateRoleDto.isActive;

    return this.prisma.role.update({
      where: { id },
      data: updateData,
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.role.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async assignRoleToUser(userId: string, roleId: string) {
    const existingAssignment = await this.prisma.userRole.findUnique({
      where: { userId_roleId: { userId, roleId } },
    });

    if (existingAssignment) {
      throw new ConflictException('User already has this role');
    }

    return this.prisma.userRole.create({
      data: { userId, roleId },
      include: {
        user: true,
        role: true,
      },
    });
  }

  async removeRoleFromUser(userId: string, roleId: string) {
    const assignment = await this.prisma.userRole.findUnique({
      where: { userId_roleId: { userId, roleId } },
    });

    if (!assignment) {
      throw new NotFoundException('User does not have this role');
    }

    return this.prisma.userRole.delete({
      where: { userId_roleId: { userId, roleId } },
    });
  }
}

