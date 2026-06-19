import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import type { StringValue } from 'ms';

import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { JwtStrategy } from './jwt.strategy';
import { LoginThrottlerGuard } from './login-throttler.guard';

@Module({
  imports: [
    UsersModule,
    ConfigModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret = config.get<string>('JWT_SECRET');
        if (!secret) throw new Error('JWT_SECRET is not set');

        const rawExpiresIn = config.get<string>('JWT_EXPIRES_IN') ?? '7d';
        const expiresIn: StringValue | number = /^\d+$/.test(rawExpiresIn)
          ? Number(rawExpiresIn)
          : (rawExpiresIn as StringValue);

        return { secret, signOptions: { expiresIn } };
      },
    }),
  ],
  providers: [AuthService, JwtStrategy, LoginThrottlerGuard], // ✅ adicionado
  controllers: [AuthController],
})
export class AuthModule {}
