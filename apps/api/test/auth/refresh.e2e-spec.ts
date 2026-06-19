// test/auth/refresh.e2e-spec.ts
import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { createTestApp } from '../helpers/app.helper';
import { loginAsAdmin } from '../helpers/auth.helper';
import { getTestPrisma, resetTestUsers } from '../helpers/seed.helper';
import { PrismaClient } from '@prisma/client';

describe('Auth — Refresh (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = getTestPrisma();
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  // Full user reset before each test guarantees no stale token hashes in the DB
  beforeEach(async () => {
    await resetTestUsers(prisma);
  });

  it('POST /auth/refresh — success with valid refresh token', async () => {
    const { refreshToken } = await loginAsAdmin(app);

    const res = await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken })
      .expect(200);

    expect(res.body).toMatchObject({
      accessToken: expect.any(String),
      refreshToken: expect.any(String),
    });
  });

  it('POST /auth/refresh — fails with invalid token', async () => {
    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: 'invalid.token.here' })
      .expect(403);
  });

  it('POST /auth/refresh — fails when reusing a rotated token', async () => {
    const { refreshToken: originalToken } = await loginAsAdmin(app);

    // Consume the token once (rotation happens here)
    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: originalToken })
      .expect(200);

    // Reuse the same (now rotated) token — must be rejected
    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: originalToken })
      .expect(403);
  });

  it('POST /auth/refresh — fails with missing body', async () => {
    await request(app.getHttpServer()).post('/auth/refresh').send({}).expect(400);
  });
});
