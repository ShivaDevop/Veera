import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

/**
 * Guard to prevent deletion of student skills
 * Student skills in wallet are immutable and cannot be deleted
 */
@Injectable()
export class SkillImmutabilityGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const method = request.method;

    if (method === 'DELETE') {
      throw new ForbiddenException(
        'Student skills cannot be deleted. Skills in wallet are immutable.',
      );
    }

    if (method === 'PUT' || method === 'PATCH') {
      const url = request.url;
      if (url.includes('/skill-wallet/') && !url.includes('/maturity')) {
        throw new ForbiddenException(
          'Student skills cannot be edited. Only maturity (level/progress) can be updated via /maturity endpoint.',
        );
      }
    }

    return true;
  }
}

