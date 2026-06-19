import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { ROLES_KEY } from './roles.decorator';

// Shape of the JWT payload attached to the request by JwtAuthGuard
interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Retrieve the roles required by the route handler
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no roles are required, allow access
    if (!requiredRoles) return true;

    // Extract the authenticated user from the request (set by JwtAuthGuard)
    const { user } = context.switchToHttp().getRequest<{ user: JwtPayload }>();

    // Allow access only if the user's role matches one of the required roles
    return requiredRoles.includes(user?.role);
  }
}
