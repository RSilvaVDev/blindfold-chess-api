import {
  ExecutionContext,
  InternalServerErrorException,
  createParamDecorator,
} from '@nestjs/common';
import type { AuthUser, AuthenticatedRequest } from './auth-user';

// Reads the user attached by SupabaseAuthGuard. A missing user means the guard
// was not applied to the route, which is a server bug, not a client error.
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthUser => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!request.user) {
      throw new InternalServerErrorException(
        'CurrentUser used on a route without SupabaseAuthGuard',
      );
    }
    return request.user;
  },
);
