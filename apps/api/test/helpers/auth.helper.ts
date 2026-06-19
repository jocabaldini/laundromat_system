import request from 'supertest';
import { INestApplication } from '@nestjs/common';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

/**
 * Performs login and returns both tokens.
 * Used by test suites that require an authenticated context.
 */
export async function loginAs(
  app: INestApplication,
  email: string,
  password: string,
): Promise<AuthTokens> {
  const res = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ email, password })
    .expect(200);

  return {
    accessToken: res.body.accessToken,
    refreshToken: res.body.refreshToken,
  };
}

/** Pre-configured helpers for the two seeded test users */
export const loginAsAdmin = (app: INestApplication) => loginAs(app, 'admin@test.com', 'Admin@123');

export const loginAsUser = (app: INestApplication) => loginAs(app, 'user@test.com', 'User@123');
