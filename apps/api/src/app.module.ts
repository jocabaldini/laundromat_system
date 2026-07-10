import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { I18nModule, AcceptLanguageResolver, HeaderResolver } from 'nestjs-i18n';
import * as path from 'path';
import { HealthController } from './health.controller';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CustomersModule } from './customers/customers.module';
import { throttlerConfig } from './throttler.config';
import { envValidationSchema } from './config/env.validation';
import { LoggerModule } from './common/logger/logger.module';
import { RequestContextMiddleware } from './common/request-context/request-context.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validationSchema: envValidationSchema,
      validationOptions: {
        abortEarly: false,
      },
    }),

    // Reads Accept-Language header; falls back to API_LOCALE env var
    I18nModule.forRootAsync({
      useFactory: (config: ConfigService) => ({
        fallbackLanguage: config.get<string>('API_LOCALE') ?? 'pt',
        loaderOptions: {
          path: path.join(
            process.env.NODE_ENV === 'production' ? __dirname : path.join(process.cwd(), 'src'),
            '/i18n/',
          ),
          watch: process.env.NODE_ENV === 'development',
        },
      }),
      resolvers: [new HeaderResolver(['Accept-Language']), AcceptLanguageResolver],
      inject: [ConfigService],
    }),

    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: throttlerConfig,
    }),
    LoggerModule,
    PrismaModule,
    AuthModule,
    UsersModule,
    CustomersModule,
  ],
  controllers: [HealthController],
})
export class AppModule implements NestModule {
  // Applies RequestContextMiddleware to all routes.
  // This must run before any other middleware to ensure requestId is available
  // throughout the entire request lifecycle.
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestContextMiddleware).forRoutes('*');
  }
}
