import { SetMetadata } from '@nestjs/common';
import { Role } from '@prisma/client';

// Key used to retrieve role metadata from the handler
export const ROLES_KEY = 'roles';

// Attaches the required roles to the route handler metadata
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
