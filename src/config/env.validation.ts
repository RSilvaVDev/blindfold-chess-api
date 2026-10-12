import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  Matches,
  Max,
  Min,
  validateSync,
} from 'class-validator';

// One or more comma-separated origins: scheme, host, optional port, no path.
const ORIGIN_LIST = /^https?:\/\/[^\s/,]+(,https?:\/\/[^\s/,]+)*$/;

const POSTGRES_URL = /^postgres(ql)?:\/\/\S+$/;

// HTTPS project URL, or plain HTTP only for a local Supabase CLI stack: the JWT
// signing keys are fetched from this origin, so it must not be spoofable.
const SUPABASE_PROJECT_URL =
  /^(https:\/\/[^\s/]+|http:\/\/(localhost|127\.0\.0\.1)(:\d+)?)$/;

export enum NodeEnv {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

// Every property needs an explicit type annotation: implicit conversion reads the
// emitted design:type, which is Object for un-annotated properties.
export class EnvironmentVariables {
  @IsOptional()
  @IsEnum(NodeEnv)
  NODE_ENV: NodeEnv = NodeEnv.Development;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  PORT: number = 3000;

  @Matches(ORIGIN_LIST, {
    message:
      'CORS_ORIGIN must be one or more comma-separated origins like https://app.example.com (no path or trailing slash)',
  })
  CORS_ORIGIN!: string;

  // Messages never include the value: connection strings carry the database password.
  @Matches(POSTGRES_URL, {
    message: 'DATABASE_URL must be a postgresql:// connection string',
  })
  DATABASE_URL!: string;

  @Matches(POSTGRES_URL, {
    message: 'DIRECT_URL must be a postgresql:// connection string',
  })
  DIRECT_URL!: string;

  @Matches(SUPABASE_PROJECT_URL, {
    message:
      'SUPABASE_URL must be the project URL like https://<project-ref>.supabase.co (no path or trailing slash)',
  })
  SUPABASE_URL!: string;
}

export function parseCorsOrigins(value: string): string[] {
  return value.split(',');
}

// Runs once at boot so a missing or malformed variable fails fast instead of at first use.
export function validateEnv(
  config: Record<string, unknown>,
): EnvironmentVariables {
  const env = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(env, { skipMissingProperties: false });

  if (errors.length > 0) {
    const details = errors
      .map((error) => Object.values(error.constraints ?? {}).join(', '))
      .join('; ');
    throw new Error(`Invalid environment: ${details}`);
  }

  return env;
}
