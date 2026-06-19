import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash, randomUUID, timingSafeEqual } from 'crypto';
import type { StringValue } from 'ms';
import { I18nService } from 'nestjs-i18n';
import { UsersService } from '../users/users.service';
import { Role } from '@prisma/client';

// SHA-256 hash of a refresh token — avoids bcrypt's 72-byte truncation limit.
// Refresh tokens are already high-entropy random values (JWT with jti),
// so they don't need the slow key-stretching that bcrypt provides for passwords.
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

// Constant-time comparison to prevent timing attacks
function tokenMatchesHash(token: string, hash: string): boolean {
  const tokenHash = Buffer.from(hashToken(token));
  const storedHash = Buffer.from(hash);
  if (tokenHash.length !== storedHash.length) return false;
  return timingSafeEqual(tokenHash, storedHash);
}

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly i18n: I18nService,
  ) {}

  async login(email: string, password: string, lang: string) {
    const user = await this.users.findByEmailWithHash(email);
    const invalidCredentials = this.i18n.t('auth.invalid_credentials', { lang });

    if (!user) throw new UnauthorizedException(invalidCredentials);

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException(invalidCredentials);

    const tokens = await this.generateTokens(user.id, user.email, user.role);
    await this.saveRefreshToken(user.id, tokens.refreshToken);

    return tokens;
  }

  async refresh(refreshToken: string, lang: string) {
    let payload: { sub: string; email: string; role: Role };

    try {
      payload = await this.jwt.verifyAsync<{ sub: string; email: string; role: Role }>(
        refreshToken,
        { secret: this.config.get<string>('JWT_REFRESH_SECRET') },
      );
    } catch {
      throw new ForbiddenException(this.i18n.t('auth.refresh_token_invalid_expired', { lang }));
    }

    const user = await this.users.findById(payload.sub);
    const accessDenied = this.i18n.t('auth.access_denied', { lang });

    if (!user) throw new ForbiddenException(accessDenied);

    const storedHash = user.refreshTokenHash;

    // Reject immediately if no hash is stored (user logged out or token was cleared)
    if (!storedHash) throw new ForbiddenException(accessDenied);

    const tokenMatch = tokenMatchesHash(refreshToken, storedHash);

    // Token does not match the stored hash — it was already rotated; possible reuse attack
    if (!tokenMatch) {
      await this.users.clearRefreshToken(user.id);
      throw new ForbiddenException(this.i18n.t('auth.refresh_token_invalid', { lang }));
    }

    // Valid token: clear the current one before issuing new pair
    await this.users.clearRefreshToken(user.id);

    const tokens = await this.generateTokens(user.id, user.email, user.role);
    await this.saveRefreshToken(user.id, tokens.refreshToken);

    return tokens;
  }

  async logout(userId: string) {
    await this.users.clearRefreshToken(userId);
  }

  async me(userId: string, lang: string) {
    return this.users.findOne(userId, lang, userId, Role.ADMIN);
  }

  private async generateTokens(userId: string, email: string, role: Role) {
    const payload = { sub: userId, email, role };

    const accessSecret = this.config.get<string>('JWT_SECRET');
    const refreshSecret = this.config.get<string>('JWT_REFRESH_SECRET');
    if (!accessSecret || !refreshSecret) throw new Error('JWT secrets not set');

    const rawAccess = this.config.get<string>('JWT_EXPIRES_IN') ?? '15m';
    const rawRefresh = this.config.get<string>('JWT_REFRESH_EXPIRES_IN') ?? '7d';

    const toExpiry = (raw: string): StringValue | number =>
      /^\d+$/.test(raw) ? Number(raw) : (raw as StringValue);

    // jti (JWT ID) ensures each token is unique even when issued at the same second
    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(
        { ...payload, jti: randomUUID() },
        {
          secret: accessSecret,
          expiresIn: toExpiry(rawAccess),
        },
      ),
      this.jwt.signAsync(
        { ...payload, jti: randomUUID() },
        {
          secret: refreshSecret,
          expiresIn: toExpiry(rawRefresh),
        },
      ),
    ]);

    return { accessToken, refreshToken };
  }

  private async saveRefreshToken(userId: string, refreshToken: string) {
    const hash = hashToken(refreshToken);
    await this.users.updateRefreshToken(userId, hash);
  }
}
