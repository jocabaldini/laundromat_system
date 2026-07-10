// test/service-items/service-items.e2e-spec.ts
import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { createTestApp } from '../helpers/app.helper';
import { loginAsAdmin, loginAsUser } from '../helpers/auth.helper';
import { getTestPrisma } from '../helpers/seed.helper';

describe('Service Items (e2e)', () => {
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
    await prisma.serviceItem.deleteMany();
  });

  // ─── POST /service-items ────────────────────────────────────────────────────

  describe('POST /service-items', () => {
    it('OPERATOR — creates a new service item', async () => {
      const res = await request(app.getHttpServer())
        .post('/service-items')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Terno simples', type: 'POR_UNIDADE', price: 40 })
        .expect(201);

      expect(res.body).toMatchObject({
        name: 'Terno simples',
        type: 'POR_UNIDADE',
      });
      expect(Number(res.body.price)).toBe(40);
      expect(res.body.deletedAt).toBeNull();
    });

    it('OPERATOR — fails with duplicate name (409)', async () => {
      await request(app.getHttpServer())
        .post('/service-items')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Terno simples', type: 'POR_UNIDADE', price: 40 })
        .expect(201);

      await request(app.getHttpServer())
        .post('/service-items')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Terno simples', type: 'POR_KG', price: 20 })
        .expect(409);
    });

    it('USER — cannot create a service item (403)', async () => {
      await request(app.getHttpServer())
        .post('/service-items')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'Terno simples', type: 'POR_UNIDADE', price: 40 })
        .expect(403);
    });

    it('unauthenticated — returns 401', async () => {
      await request(app.getHttpServer())
        .post('/service-items')
        .send({ name: 'Terno simples', type: 'POR_UNIDADE', price: 40 })
        .expect(401);
    });
  });

  // ─── GET /service-items ─────────────────────────────────────────────────────

  describe('GET /service-items', () => {
    it('OPERATOR — returns list of service items', async () => {
      await request(app.getHttpServer())
        .post('/service-items')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Terno simples', type: 'POR_UNIDADE', price: 40 })
        .expect(201);

      const res = await request(app.getHttpServer())
        .get('/service-items')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(1);
      expect(res.body[0]).toMatchObject({ name: 'Terno simples' });
    });

    it('OPERATOR — excludes soft-deleted items by default', async () => {
      const created = await request(app.getHttpServer())
        .post('/service-items')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Terno simples', type: 'POR_UNIDADE', price: 40 })
        .expect(201);

      await request(app.getHttpServer())
        .delete(`/service-items/${created.body.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const res = await request(app.getHttpServer())
        .get('/service-items')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toHaveLength(0);
    });

    it('OPERATOR — includes soft-deleted items when includeDeleted=true', async () => {
      const created = await request(app.getHttpServer())
        .post('/service-items')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Terno simples', type: 'POR_UNIDADE', price: 40 })
        .expect(201);

      await request(app.getHttpServer())
        .delete(`/service-items/${created.body.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const res = await request(app.getHttpServer())
        .get('/service-items')
        .query({ includeDeleted: 'true' })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toHaveLength(1);
      expect(res.body[0].deletedAt).not.toBeNull();
    });

    it('USER — cannot list service items (403)', async () => {
      await request(app.getHttpServer())
        .get('/service-items')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('unauthenticated — returns 401', async () => {
      await request(app.getHttpServer()).get('/service-items').expect(401);
    });
  });

  // ─── GET /service-items/:id ─────────────────────────────────────────────────

  describe('GET /service-items/:id', () => {
    it('OPERATOR — returns a service item by id', async () => {
      const created = await request(app.getHttpServer())
        .post('/service-items')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Terno simples', type: 'POR_UNIDADE', price: 40 })
        .expect(201);

      const res = await request(app.getHttpServer())
        .get(`/service-items/${created.body.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toMatchObject({ id: created.body.id, name: 'Terno simples' });
    });

    it('OPERATOR — returns 404 for non-existent item', async () => {
      await request(app.getHttpServer())
        .get('/service-items/nonexistentid123')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('USER — cannot read a service item (403)', async () => {
      const created = await request(app.getHttpServer())
        .post('/service-items')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Terno simples', type: 'POR_UNIDADE', price: 40 })
        .expect(201);

      await request(app.getHttpServer())
        .get(`/service-items/${created.body.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });
  });

  // ─── PATCH /service-items/:id ───────────────────────────────────────────────

  describe('PATCH /service-items/:id', () => {
    it('OPERATOR — updates a service item', async () => {
      const created = await request(app.getHttpServer())
        .post('/service-items')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Terno simples', type: 'POR_UNIDADE', price: 40 })
        .expect(201);

      const res = await request(app.getHttpServer())
        .patch(`/service-items/${created.body.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ price: 45 })
        .expect(200);

      expect(Number(res.body.price)).toBe(45);
      expect(res.body.name).toBe('Terno simples');
    });

    it('OPERATOR — fails when changing to a name already in use (409)', async () => {
      await request(app.getHttpServer())
        .post('/service-items')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Terno simples', type: 'POR_UNIDADE', price: 40 })
        .expect(201);

      const other = await request(app.getHttpServer())
        .post('/service-items')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Vestido curto', type: 'POR_UNIDADE', price: 35 })
        .expect(201);

      await request(app.getHttpServer())
        .patch(`/service-items/${other.body.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Terno simples' })
        .expect(409);
    });

    it('OPERATOR — returns 404 when updating non-existent item', async () => {
      await request(app.getHttpServer())
        .patch('/service-items/nonexistentid123')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ price: 10 })
        .expect(404);
    });

    it('USER — cannot update a service item (403)', async () => {
      const created = await request(app.getHttpServer())
        .post('/service-items')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Terno simples', type: 'POR_UNIDADE', price: 40 })
        .expect(201);

      await request(app.getHttpServer())
        .patch(`/service-items/${created.body.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ price: 10 })
        .expect(403);
    });
  });

  // ─── DELETE /service-items/:id ──────────────────────────────────────────────

  describe('DELETE /service-items/:id', () => {
    it('OPERATOR — soft-deletes a service item', async () => {
      const created = await request(app.getHttpServer())
        .post('/service-items')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Terno simples', type: 'POR_UNIDADE', price: 40 })
        .expect(201);

      await request(app.getHttpServer())
        .delete(`/service-items/${created.body.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Record still exists in the database — soft-deleted, not removed
      const stillExists = await prisma.serviceItem.findUnique({ where: { id: created.body.id } });
      expect(stillExists).not.toBeNull();
      expect(stillExists?.deletedAt).not.toBeNull();
    });

    it('USER — cannot delete a service item (403)', async () => {
      const created = await request(app.getHttpServer())
        .post('/service-items')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Terno simples', type: 'POR_UNIDADE', price: 40 })
        .expect(201);

      await request(app.getHttpServer())
        .delete(`/service-items/${created.body.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('unauthenticated — returns 401', async () => {
      await request(app.getHttpServer()).delete('/service-items/nonexistentid123').expect(401);
    });

    it('OPERATOR — returns 404 when deleting non-existent item', async () => {
      await request(app.getHttpServer())
        .delete('/service-items/nonexistentid123')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });
});
