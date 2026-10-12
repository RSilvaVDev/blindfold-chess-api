import type { Request } from 'express';

// The caller as verified by SupabaseAuthGuard. `id` is the JWT subject and the
// key every user-owned row is scoped by.
export interface AuthUser {
  id: string;
  email: string | null;
  role: string | null;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}
