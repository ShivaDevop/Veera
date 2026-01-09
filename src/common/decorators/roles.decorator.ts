import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
export type Role = 'Student' | 'Teacher' | 'Parent' | 'SchoolAdmin' | 'PlatformAdmin';

export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

