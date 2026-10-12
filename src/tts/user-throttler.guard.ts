import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { AuthenticatedRequest } from '../auth/auth-user';

// Rate-limits per signed-in user instead of per IP, so users behind one NAT do
// not share a budget and one user cannot dodge the limit by changing networks.
// Runs after SupabaseAuthGuard, which sets request.user.
@Injectable()
export class UserThrottlerGuard extends ThrottlerGuard {
  protected getTracker(request: Record<string, unknown>): Promise<string> {
    const user = (request as unknown as AuthenticatedRequest).user;
    return Promise.resolve(
      user ? `user:${user.id}` : `ip:${String(request.ip)}`,
    );
  }
}
