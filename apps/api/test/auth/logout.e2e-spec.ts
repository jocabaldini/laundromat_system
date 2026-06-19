// test/auth/logout.e2e-spec.ts
import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { createTestApp } from '../helpers/app.helper';
import { loginAsAdmin } from '../helpers/auth.helper';

describe('Auth — Logout (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /auth/logout — success returns 204', async () => {
    const { accessToken } = await loginAsAdmin(app);

    await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(204);
  });

  it('POST /auth/logout — fails without token', async () => {
    await request(app.getHttpServer()).post('/auth/logout').expect(401);
  });

  it('POST /auth/logout — fails with invalid token', async () => {
    await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Authorization', 'Bearer invalid.token.here')
      .expect(401);
  });
});
