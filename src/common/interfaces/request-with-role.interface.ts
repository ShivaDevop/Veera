import { Request } from 'express';
import { Role } from '../decorators/roles.decorator';

export interface RequestWithRole extends Request {
  activeRole?: Role;
  user?: {
    id: string;
    email: string;
    roles: Role[];
  };
}

