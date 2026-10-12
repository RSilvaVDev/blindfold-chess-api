import {
  Body,
  Controller,
  Header,
  HttpCode,
  Post,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { SynthesizeDto } from './synthesize.dto';
import { TtsService } from './tts.service';
import { UserThrottlerGuard } from './user-throttler.guard';

@Controller('tts')
@UseGuards(SupabaseAuthGuard, UserThrottlerGuard)
export class TtsController {
  constructor(private readonly tts: TtsService) {}

  // A move plus its reply is two lines; 40 a minute leaves room for queries.
  @Post()
  @HttpCode(200)
  @Throttle({ default: { limit: 40, ttl: 60_000 } })
  @Header('Content-Type', 'audio/mpeg')
  @Header('Cache-Control', 'private, max-age=86400')
  async synthesize(@Body() body: SynthesizeDto): Promise<StreamableFile> {
    const audio = await this.tts.speak(body.text, body.voiceId);
    return new StreamableFile(audio);
  }
}
