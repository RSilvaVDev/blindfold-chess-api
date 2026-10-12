import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from '../auth/auth.module';
import { ElevenLabsClient } from './elevenlabs.client';
import { TtsController } from './tts.controller';
import { TtsService } from './tts.service';

@Module({
  imports: [
    AuthModule,
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 40 }]),
  ],
  controllers: [TtsController],
  providers: [ElevenLabsClient, TtsService],
})
export class TtsModule {}
