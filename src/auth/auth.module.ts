import { Module } from '@nestjs/common';
import { MeController } from './me.controller';
import { SupabaseAuthGuard } from './supabase-auth.guard';

@Module({
  controllers: [MeController],
  providers: [SupabaseAuthGuard],
  exports: [SupabaseAuthGuard],
})
export class AuthModule {}
