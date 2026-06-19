// test/users/users.e2e-spec.ts
import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { createTestApp } from '../helpers/app.helper';
import { loginAsAdmin, loginAsUser } from '../helpers/auth.helper';

describe('Users (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let userToken: string;
  let adminId: string;
  let userId: string;

  beforeAll(async () => {
    app = await createTestApp();

    const admin = await loginAsAdmin(app);
    adminToken = admin.accessToken;

    const user = await loginAsUser(app);
    userToken = user.accessToken;

    // Resolve IDs via /auth/me
    const adminMe = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${adminToken}`);
    adminId = adminMe.body.id;

    const userMe = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${userToken}`);
    userId = userMe.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  // ─── POST /users ───────────────────────────────────────────────────────────

  describe('POST /users', () => {
    it('ADMIN — creates a new user', async () => {
      const res = await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'new@test.com',
          name: 'New User',
          password: 'NewUser@123',
        })
        .expect(201);

      expect(res.body).toMatchObject({
        email: 'new@test.com',
        name: 'New User',
        role: 'USER',
      });
      expect(res.body).not.toHaveProperty('passwordHash');
    });

    it('ADMIN — creates a user with explicit ADMIN role', async () => {
      const res = await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'newadmin@test.com',
          name: 'New Admin',
          password: 'NewAdmin@123',
          role: 'ADMIN',
        })
        .expect(201);

      expect(res.body).toMatchObject({ role: 'ADMIN' });
    });

    it('USER — cannot create a user (403)', async () => {
      await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          email: 'forbidden@test.com',
          name: 'Forbidden',
          password: 'Forbidden@123',
        })
        .expect(403);
    });

    it('unauthenticated — returns 401', async () => {
      await request(app.getHttpServer())
        .post('/users')
        .send({ email: 'x@test.com', name: 'X', password: 'X@123456' })
        .expect(401);
    });

    it('ADMIN — fails with duplicate email (409)', async () => {
      await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'admin@test.com',
          name: 'Dup',
          password: 'Dup@12345',
        })
        .expect(409);
    });
  });

  // ─── GET /users ────────────────────────────────────────────────────────────

  describe('GET /users', () => {
    it('ADMIN — returns list of users', async () => {
      const res = await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(2);
    });

    it('USER — cannot list users (403)', async () => {
      await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('unauthenticated — returns 401', async () => {
      await request(app.getHttpServer()).get('/users').expect(401);
    });
  });

  // ─── GET /users/:id ────────────────────────────────────────────────────────

  describe('GET /users/:id', () => {
    it('ADMIN — can read any user', async () => {
      const res = await request(app.getHttpServer())
        .get(`/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toMatchObject({ id: userId });
    });

    it('USER — can read own profile', async () => {
      const res = await request(app.getHttpServer())
        .get(`/users/${userId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(res.body).toMatchObject({ id: userId });
    });

    it("USER — cannot read another user's profile (403)", async () => {
      await request(app.getHttpServer())
        .get(`/users/${adminId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('ADMIN — returns 404 for non-existent user', async () => {
      await request(app.getHttpServer())
        .get('/users/nonexistentid123')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('unauthenticated — returns 401', async () => {
      await request(app.getHttpServer()).get(`/users/${userId}`).expect(401);
    });
  });

  // ─── PATCH /users/:id ──────────────────────────────────────────────────────

  describe('PATCH /users/:id', () => {
    it('ADMIN — can update any user', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Updated by Admin' })
        .expect(200);

      expect(res.body).toMatchObject({ name: 'Updated by Admin' });
    });

    it('USER — can update own profile', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/users/${userId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'Updated by Self' })
        .expect(200);

      expect(res.body).toMatchObject({ name: 'Updated by Self' });
    });

    it("USER — cannot update another user's profile (403)", async () => {
      await request(app.getHttpServer())
        .patch(`/users/${adminId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'Hacked' })
        .expect(403);
    });

    it('unauthenticated — returns 401', async () => {
      await request(app.getHttpServer()).patch(`/users/${userId}`).send({ name: 'X' }).expect(401);
    });
  });

  // ─── DELETE /users/:id ─────────────────────────────────────────────────────

  describe('DELETE /users/:id', () => {
    it('USER — cannot delete a user (403)', async () => {
      await request(app.getHttpServer())
        .delete(`/users/${userId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('unauthenticated — returns 401', async () => {
      await request(app.getHttpServer()).delete(`/users/${userId}`).expect(401);
    });

    it('ADMIN — can delete a user', async () => {
      // Create a throwaway user to delete
      const created = await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'todelete@test.com',
          name: 'To Delete',
          password: 'Delete@123',
        })
        .expect(201);

      await request(app.getHttpServer())
        .delete(`/users/${created.body.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });

    it('ADMIN — returns 404 when deleting non-existent user', async () => {
      await request(app.getHttpServer())
        .delete('/users/nonexistentid123')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });
});
