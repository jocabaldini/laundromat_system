import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { I18nValidationPipe, I18nValidationExceptionFilter } from 'nestjs-i18n';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggerService } from './common/logger/logger.service';

function parseCorsOrigins(value: string | undefined): string[] {
  if (!value) return ['http://localhost:3000']; // dev fallback

  const trimmed = value.trim();
  if (trimmed === '*') {
    throw new Error('CORS_ORIGIN="*" is not allowed');
  }

  return trimmed
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    // Suppress NestJS default logger during bootstrap — our logger takes over below
    bufferLogs: true,
  });

  app.set('trust proxy', 1);
  app.use(helmet());
  // Triggers OnModuleDestroy on SIGINT/SIGTERM
  app.enableShutdownHooks();

  const corsOrigin = parseCorsOrigins(process.env.CORS_ORIGIN);

  app.enableCors({
    origin: (origin, cb) => {
      // No Origin header (curl / server-to-server / healthcheck) -> allow
      if (!origin) return cb(null, true);
      return cb(null, corsOrigin.includes(origin));
    },
    credentials: false, // Bearer token — credentials not needed
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept-Language', 'X-Request-ID'],
  });

  // Replaces the default ValidationPipe — keeps whitelist/forbid/transform
  // and adds i18n support for DTO validation messages
  app.useGlobalPipes(
    new I18nValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Resolve LoggerService from the DI container and register as the framework logger.
  // From this point, all NestJS internal logs go through our structured logger.
  const logger = app.get(LoggerService);
  app.useLogger(logger);
  app.flushLogs();

  // Order matters: NestJS applies filters last-to-first.
  // I18nValidationExceptionFilter runs first (most specific — DTO validation errors).
  // HttpExceptionFilter runs second as the general fallback for everything else.
  app.useGlobalFilters(new HttpExceptionFilter(logger), new I18nValidationExceptionFilter());

  const rawPort = process.env.PORT ?? '3001';
  const port = Number(rawPort);

  if (Number.isNaN(port)) {
    throw new Error(`Invalid PORT value: "${rawPort}"`);
  }

  await app.listen(port, '0.0.0.0');
  logger.info(`API listening on :${port}`, { env: process.env.NODE_ENV ?? 'undefined' });
}

void bootstrap();
