import { Injectable, NestMiddleware, BadRequestException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { Role } from '../decorators/roles.decorator';

@Injectable()
export class RoleContextMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const activeRoleHeader = req.headers['x-active-role'] as string;

    if (activeRoleHeader) {
      const validRoles: Role[] = [
        'Student',
        'Teacher',
        'Parent',
        'SchoolAdmin',
        'PlatformAdmin',
      ];

      if (!validRoles.includes(activeRoleHeader as Role)) {
        throw new BadRequestException(
          `Invalid role: ${activeRoleHeader}. Valid roles are: ${validRoles.join(', ')}`,
        );
      }

      req.activeRole = activeRoleHeader as Role;
    }

    next();
  }
}

