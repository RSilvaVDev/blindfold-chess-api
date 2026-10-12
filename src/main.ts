import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import {
  EnvironmentVariables,
  parseCorsOrigins,
} from './config/env.validation';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService<EnvironmentVariables, true>);

  // Runs onModuleDestroy (Prisma disconnect) when Railway stops the container with SIGTERM.
  app.enableShutdownHooks();

  // Only the web client may call the API from a browser; auth uses a bearer token, not cookies.
  app.enableCors({
    origin: parseCorsOrigins(config.get('CORS_ORIGIN', { infer: true })),
    methods: ['GET', 'PUT', 'POST'],
    allowedHeaders: ['Authorization', 'Content-Type'],
    credentials: false,
  });

  await app.listen(config.get('PORT', { infer: true }));
}

void bootstrap();
