import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY, Role } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
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

    const userRoles = user.roles as Role[];

    if (!userRoles.includes(activeRole)) {
      throw new ForbiddenException(
        `User does not have the active role: ${activeRole}`,
      );
    }

    if (!requiredRoles.includes(activeRole)) {
      throw new ForbiddenException(
        `Active role '${activeRole}' is not authorized for this endpoint. Required roles: ${requiredRoles.join(', ')}`,
      );
    }

    return true;
  }
}

