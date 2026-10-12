import {
  CanActivate,
  ExecutionContext,
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { fromSupabaseUrl } from '@supabase/server';
import { verifyCredentials } from '@supabase/server/core';
import type { EnvironmentVariables } from '../config/env.validation';
import type { AuthenticatedRequest } from './auth-user';

const BEARER = /^Bearer\s+(\S+)$/i;

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  private readonly logger = new Logger(SupabaseAuthGuard.name);
  private readonly supabaseUrl: string;
  private readonly issuer: string;

  constructor(config: ConfigService<EnvironmentVariables, true>) {
    this.supabaseUrl = config.get('SUPABASE_URL', { infer: true });
    this.issuer = fromSupabaseUrl(this.supabaseUrl);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = BEARER.exec(request.headers.authorization ?? '')?.[1];
    if (!token) {
      throw new UnauthorizedException('Sign in to continue.');
    }

    // Verified locally against the project's published ES256 keys (JWKS);
    // the issuer check rejects tokens minted by any other Supabase project.
    const { data, error } = await verifyCredentials(
      { token, apikey: null },
      { auth: 'user', issuer: this.issuer, env: { url: this.supabaseUrl } },
    );

    if (error) {
      if (error.status >= 500) {
        this.logger.error(`Token verification unavailable: ${error.message}`);
        throw new InternalServerErrorException();
      }
      throw new UnauthorizedException('Your session expired. Sign in again.');
    }

    const claims = data.userClaims;
    if (!claims) {
      throw new UnauthorizedException('Sign in to continue.');
    }

    request.user = {
      id: claims.id,
      email: claims.email ?? null,
      role: claims.role ?? null,
    };
    return true;
  }
}
