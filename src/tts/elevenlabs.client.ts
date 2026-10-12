import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EnvironmentVariables } from '../config/env.validation';

const API = 'https://api.elevenlabs.io/v1/text-to-speech';
// Low-latency model; 64 kbps MP3 is plenty for speech and keeps payloads small.
const MODEL_ID = 'eleven_flash_v2_5';
const OUTPUT_FORMAT = 'mp3_44100_64';
const TIMEOUT_MS = 15_000;

@Injectable()
export class ElevenLabsClient {
  private readonly logger = new Logger(ElevenLabsClient.name);
  private readonly apiKey: string;

  constructor(config: ConfigService<EnvironmentVariables, true>) {
    this.apiKey = config.get('ELEVENLABS_API_KEY', { infer: true });
  }

  async synthesize(text: string, voiceId: string): Promise<Buffer> {
    let response: Response;
    try {
      response = await fetch(
        `${API}/${voiceId}?output_format=${OUTPUT_FORMAT}`,
        {
          method: 'POST',
          headers: {
            'xi-api-key': this.apiKey,
            'Content-Type': 'application/json',
            Accept: 'audio/mpeg',
          },
          body: JSON.stringify({ text, model_id: MODEL_ID }),
          signal: AbortSignal.timeout(TIMEOUT_MS),
        },
      );
    } catch (error) {
      this.logger.error(`ElevenLabs request failed: ${String(error)}`);
      throw new ServiceUnavailableException('Speech is unavailable right now.');
    }

    if (!response.ok) {
      // Log the status only: the body can echo request details.
      this.logger.error(`ElevenLabs responded ${response.status}`);
      throw new ServiceUnavailableException('Speech is unavailable right now.');
    }
    return Buffer.from(await response.arrayBuffer());
  }
}
