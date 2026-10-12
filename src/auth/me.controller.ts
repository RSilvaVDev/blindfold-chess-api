import { Controller, Get, UseGuards } from '@nestjs/common';
import type { AuthUser } from './auth-user';
import { CurrentUser } from './current-user.decorator';
import { SupabaseAuthGuard } from './supabase-auth.guard';

@Controller('me')
@UseGuards(SupabaseAuthGuard)
export class MeController {
  @Get()
  me(@CurrentUser() user: AuthUser): AuthUser {
    return user;
  }
}
