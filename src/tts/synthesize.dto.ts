import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

// Longest announcement the app speaks is a board readout; cap it to bound cost.
export const MAX_TTS_CHARS = 600;

export class SynthesizeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(MAX_TTS_CHARS)
  text!: string;

  // ElevenLabs voice ids are 20 alphanumeric characters.
  @IsOptional()
  @Matches(/^[A-Za-z0-9]{20}$/, { message: 'voiceId is not a valid voice id' })
  voiceId?: string;
}
