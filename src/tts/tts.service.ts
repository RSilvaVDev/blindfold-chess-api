import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EnvironmentVariables } from '../config/env.validation';
import { ElevenLabsClient } from './elevenlabs.client';

// Most lines repeat ("check", common moves, prompts), so keep recent audio in
// memory. Map preserves insertion order, which makes eviction oldest-first.
const MAX_CACHED = 500;

@Injectable()
export class TtsService {
  private readonly cache = new Map<string, Buffer>();
  private readonly defaultVoiceId: string;

  constructor(
    private readonly elevenLabs: ElevenLabsClient,
    config: ConfigService<EnvironmentVariables, true>,
  ) {
    this.defaultVoiceId = config.get('ELEVENLABS_DEFAULT_VOICE_ID', {
      infer: true,
    });
  }

  async speak(text: string, voiceId?: string): Promise<Buffer> {
    const voice = voiceId ?? this.defaultVoiceId;
    const key = createHash('sha256').update(`${voice}\n${text}`).digest('hex');

    const cached = this.cache.get(key);
    if (cached) {
      // Refresh recency.
      this.cache.delete(key);
      this.cache.set(key, cached);
      return cached;
    }

    const audio = await this.elevenLabs.synthesize(text, voice);
    this.cache.set(key, audio);
    if (this.cache.size > MAX_CACHED) {
      const oldest = this.cache.keys().next().value;
      if (oldest !== undefined) this.cache.delete(oldest);
    }
    return audio;
  }
}
