import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../database/prisma.service';
import { Role } from '../decorators/roles.decorator';

@Injectable()
export class RbacGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      'permissions',
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    const activeRole = request.activeRole as Role | undefined;

    if (!activeRole) {
      throw new BadRequestException(
        'Active role must be set. Include X-Active-Role header in your request.',
      );
    }

    const userRoles = await this.prisma.userRole.findMany({
      where: { userId: user.id },
      include: { role: true },
    });

    const userRoleNames = userRoles.map((ur) => ur.role.name);
    if (!userRoleNames.includes(activeRole)) {
      throw new ForbiddenException(
        `User does not have the active role: ${activeRole}`,
      );
    }

    const activeUserRole = userRoles.find((ur) => ur.role.name === activeRole);
    if (!activeUserRole) {
      throw new ForbiddenException('Active role not found');
    }

    const rolePermissions = activeUserRole.role.permissions as string[];

    const hasPermission = requiredPermissions.some((permission) =>
      rolePermissions.includes(permission),
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        `Insufficient permissions. Active role '${activeRole}' does not have required permissions: ${requiredPermissions.join(', ')}`,
      );
    }

    return true;
  }
}

