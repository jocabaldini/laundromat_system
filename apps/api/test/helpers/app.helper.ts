import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import { LoggerService } from '../../src/common/logger/logger.service';
import { HttpExceptionFilter } from '../../src/common/filters/http-exception.filter';
import { I18nValidationExceptionFilter } from 'nestjs-i18n';

export async function createTestApp(): Promise<INestApplication> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );

  const logger = app.get(LoggerService);
  app.useGlobalFilters(new HttpExceptionFilter(logger), new I18nValidationExceptionFilter());

  await app.init();
  return app;
}
