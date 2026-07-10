// test/customers/customers.e2e-spec.ts
import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { createTestApp } from '../helpers/app.helper';
import { loginAsAdmin, loginAsUser } from '../helpers/auth.helper';
import { getTestPrisma } from '../helpers/seed.helper';

describe('Customers (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let adminToken: string;
  let userToken: string;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = getTestPrisma();

    const admin = await loginAsAdmin(app);
    adminToken = admin.accessToken;

    const user = await loginAsUser(app);
    userToken = user.accessToken;
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  beforeEach(async () => {
    await prisma.customer.deleteMany();
  });

  // ─── POST /customers ───────────────────────────────────────────────────────

  describe('POST /customers', () => {
    it('OPERATOR — creates a new customer', async () => {
      const res = await request(app.getHttpServer())
        .post('/customers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Ana Souza', code: 'abc', phone: '11999999999' })
        .expect(201);

      expect(res.body).toMatchObject({
        name: 'Ana Souza',
        code: 'ABC', // stored uppercased
        phone: '11999999999',
      });
      expect(res.body.deletedAt).toBeNull();
    });

    it('OPERATOR — fails with duplicate code (409)', async () => {
      await request(app.getHttpServer())
        .post('/customers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Ana Souza', code: 'ABC' })
        .expect(201);

      await request(app.getHttpServer())
        .post('/customers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Outra Pessoa', code: 'abc' })
        .expect(409);
    });

    it('USER — cannot create a customer (403)', async () => {
      await request(app.getHttpServer())
        .post('/customers')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'Ana Souza', code: 'ABC' })
        .expect(403);
    });

    it('unauthenticated — returns 401', async () => {
      await request(app.getHttpServer())
        .post('/customers')
        .send({ name: 'Ana Souza', code: 'ABC' })
        .expect(401);
    });
  });

  // ─── GET /customers ────────────────────────────────────────────────────────

  describe('GET /customers', () => {
    it('OPERATOR — returns list of customers', async () => {
      await request(app.getHttpServer())
        .post('/customers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Ana Souza', code: 'ABC' })
        .expect(201);

      const res = await request(app.getHttpServer())
        .get('/customers')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(1);
      expect(res.body[0]).toMatchObject({ code: 'ABC' });
    });

    it('OPERATOR — filters by search term', async () => {
      await request(app.getHttpServer())
        .post('/customers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Ana Souza', code: 'ABC' })
        .expect(201);

      await request(app.getHttpServer())
        .post('/customers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Carlos Lima', code: 'XYZ' })
        .expect(201);

      const res = await request(app.getHttpServer())
        .get('/customers')
        .query({ search: 'ana' })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toHaveLength(1);
      expect(res.body[0]).toMatchObject({ name: 'Ana Souza' });
    });

    it('OPERATOR — excludes soft-deleted customers by default', async () => {
      const created = await request(app.getHttpServer())
        .post('/customers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Ana Souza', code: 'ABC' })
        .expect(201);

      await request(app.getHttpServer())
        .delete(`/customers/${created.body.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const res = await request(app.getHttpServer())
        .get('/customers')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toHaveLength(0);
    });

    it('OPERATOR — includes soft-deleted customers when includeDeleted=true', async () => {
      const created = await request(app.getHttpServer())
        .post('/customers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Ana Souza', code: 'ABC' })
        .expect(201);

      await request(app.getHttpServer())
        .delete(`/customers/${created.body.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const res = await request(app.getHttpServer())
        .get('/customers')
        .query({ includeDeleted: 'true' })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toHaveLength(1);
      expect(res.body[0].deletedAt).not.toBeNull();
    });

    it('USER — cannot list customers (403)', async () => {
      await request(app.getHttpServer())
        .get('/customers')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('unauthenticated — returns 401', async () => {
      await request(app.getHttpServer()).get('/customers').expect(401);
    });
  });

  // ─── GET /customers/code/:code ─────────────────────────────────────────────

  describe('GET /customers/code/:code', () => {
    it('OPERATOR — finds customer by code (case-insensitive)', async () => {
      await request(app.getHttpServer())
        .post('/customers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Ana Souza', code: 'ABC' })
        .expect(201);

      const res = await request(app.getHttpServer())
        .get('/customers/code/abc')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toMatchObject({ code: 'ABC', name: 'Ana Souza' });
    });

    it('OPERATOR — returns 404 for non-existent code', async () => {
      await request(app.getHttpServer())
        .get('/customers/code/zzz')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  // ─── GET /customers/code/:code/availability ────────────────────────────────

  describe('GET /customers/code/:code/availability', () => {
    it('OPERATOR — returns available true for unused code', async () => {
      const res = await request(app.getHttpServer())
        .get('/customers/code/xyz/availability')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toEqual({ available: true });
    });

    it('OPERATOR — returns available false for a code already in use', async () => {
      await request(app.getHttpServer())
        .post('/customers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Ana Souza', code: 'ABC' })
        .expect(201);

      const res = await request(app.getHttpServer())
        .get('/customers/code/abc/availability')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toEqual({ available: false });
    });

    it('OPERATOR — returns available false even for a soft-deleted customer code', async () => {
      const created = await request(app.getHttpServer())
        .post('/customers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Ana Souza', code: 'ABC' })
        .expect(201);

      await request(app.getHttpServer())
        .delete(`/customers/${created.body.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const res = await request(app.getHttpServer())
        .get('/customers/code/abc/availability')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toEqual({ available: false });
    });
  });

  // ─── GET /customers/suggest-code ───────────────────────────────────────────

  describe('GET /customers/suggest-code', () => {
    it('OPERATOR — suggests a code based on the given name', async () => {
      const res = await request(app.getHttpServer())
        .get('/customers/suggest-code')
        .query({ name: 'Maria Aparecida Santos' })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toEqual({ code: 'MAS' });
    });
  });

  // ─── GET /customers/:id ─────────────────────────────────────────────────────

  describe('GET /customers/:id', () => {
    it('OPERATOR — returns 404 for non-existent customer', async () => {
      await request(app.getHttpServer())
        .get('/customers/nonexistentid123')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  // ─── PATCH /customers/:id ───────────────────────────────────────────────────

  describe('PATCH /customers/:id', () => {
    it('OPERATOR — updates a customer', async () => {
      const created = await request(app.getHttpServer())
        .post('/customers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Ana Souza', code: 'ABC' })
        .expect(201);

      const res = await request(app.getHttpServer())
        .patch(`/customers/${created.body.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Ana Souza Lima' })
        .expect(200);

      expect(res.body).toMatchObject({ name: 'Ana Souza Lima', code: 'ABC' });
    });

    it('OPERATOR — fails when changing to a code already in use (409)', async () => {
      await request(app.getHttpServer())
        .post('/customers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Ana Souza', code: 'ABC' })
        .expect(201);

      const other = await request(app.getHttpServer())
        .post('/customers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Carlos Lima', code: 'XYZ' })
        .expect(201);

      await request(app.getHttpServer())
        .patch(`/customers/${other.body.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ code: 'abc' })
        .expect(409);
    });

    it('OPERATOR — returns 404 when updating non-existent customer', async () => {
      await request(app.getHttpServer())
        .patch('/customers/nonexistentid123')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'X' })
        .expect(404);
    });

    it('USER — cannot update a customer (403)', async () => {
      const created = await request(app.getHttpServer())
        .post('/customers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Ana Souza', code: 'ABC' })
        .expect(201);

      await request(app.getHttpServer())
        .patch(`/customers/${created.body.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'Hacked' })
        .expect(403);
    });
  });

  // ─── DELETE /customers/:id ──────────────────────────────────────────────────

  describe('DELETE /customers/:id', () => {
    it('OPERATOR — soft-deletes a customer', async () => {
      const created = await request(app.getHttpServer())
        .post('/customers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Ana Souza', code: 'ABC' })
        .expect(201);

      await request(app.getHttpServer())
        .delete(`/customers/${created.body.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Record still exists in the database — soft-deleted, not removed
      const stillExists = await prisma.customer.findUnique({ where: { id: created.body.id } });
      expect(stillExists).not.toBeNull();
      expect(stillExists?.deletedAt).not.toBeNull();
    });

    it('USER — cannot delete a customer (403)', async () => {
      const created = await request(app.getHttpServer())
        .post('/customers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Ana Souza', code: 'ABC' })
        .expect(201);

      await request(app.getHttpServer())
        .delete(`/customers/${created.body.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('unauthenticated — returns 401', async () => {
      await request(app.getHttpServer()).delete('/customers/nonexistentid123').expect(401);
    });

    it('OPERATOR — returns 404 when deleting non-existent customer', async () => {
      await request(app.getHttpServer())
        .delete('/customers/nonexistentid123')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });
});
