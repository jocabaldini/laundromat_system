// test/service-orders/service-orders.e2e-spec.ts
import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { createTestApp } from '../helpers/app.helper';
import { loginAsAdmin, loginAsUser } from '../helpers/auth.helper';
import { getTestPrisma } from '../helpers/seed.helper';

describe('Service Orders (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let adminToken: string;
  let userToken: string;
  let customerId: string;
  let serviceItemId: string;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = getTestPrisma();

    const admin = await loginAsAdmin(app);
    adminToken = admin.accessToken;

    const user = await loginAsUser(app);
    userToken = user.accessToken;

    // Fixtures required by the FK constraints on ServiceOrder/ServiceOrderItem —
    // created once for the whole suite, not the subject under test here.
    await prisma.customer.deleteMany();
    await prisma.serviceItem.deleteMany();

    const customer = await prisma.customer.create({
      data: { code: 'ANA', name: 'Ana Souza' },
    });
    customerId = customer.id;

    const serviceItem = await prisma.serviceItem.create({
      data: { name: 'Terno simples', type: 'POR_UNIDADE', price: 40 },
    });
    serviceItemId = serviceItem.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  beforeEach(async () => {
    // Delete children before parent — ServiceOrderItem has a mandatory FK to ServiceOrder.
    await prisma.serviceOrderItem.deleteMany();
    await prisma.serviceOrder.deleteMany();
  });

  function orderPayload(overrides: Record<string, unknown> = {}) {
    return {
      customerId,
      estimatedDeliveryAt: '2026-08-01T00:00:00.000Z',
      items: [{ serviceItemId, quantity: 2 }],
      ...overrides,
    };
  }

  // ─── POST /service-orders ───────────────────────────────────────────────────

  describe('POST /service-orders', () => {
    it('OPERATOR — creates a new service order with items', async () => {
      const res = await request(app.getHttpServer())
        .post('/service-orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(orderPayload())
        .expect(201);

      expect(res.body).toMatchObject({
        status: 'RECEIVED',
        customer: { id: customerId, code: 'ANA' },
      });
      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0]).toMatchObject({
        serviceItemId,
        serviceItemName: 'Terno simples',
        serviceItemType: 'POR_UNIDADE',
        status: 'RECEIVED',
      });
      expect(Number(res.body.referenceTotal)).toBe(80);
      expect(Number(res.body.finalTotal)).toBe(80);
      expect(Number(res.body.discount)).toBe(0);
    });

    it('OPERATOR — returns 404 for a non-existent service item', async () => {
      await request(app.getHttpServer())
        .post('/service-orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(orderPayload({ items: [{ serviceItemId: 'nonexistentid123', quantity: 1 }] }))
        .expect(404);
    });

    it('USER — cannot create a service order (403)', async () => {
      await request(app.getHttpServer())
        .post('/service-orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send(orderPayload())
        .expect(403);
    });

    it('unauthenticated — returns 401', async () => {
      await request(app.getHttpServer()).post('/service-orders').send(orderPayload()).expect(401);
    });
  });

  // ─── GET /service-orders ────────────────────────────────────────────────────

  describe('GET /service-orders', () => {
    it('OPERATOR — returns list of service orders', async () => {
      await request(app.getHttpServer())
        .post('/service-orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(orderPayload())
        .expect(201);

      const res = await request(app.getHttpServer())
        .get('/service-orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(1);
    });

    it('OPERATOR — filters by customerId', async () => {
      await request(app.getHttpServer())
        .post('/service-orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(orderPayload())
        .expect(201);

      const res = await request(app.getHttpServer())
        .get('/service-orders')
        .query({ customerId })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toHaveLength(1);

      const otherRes = await request(app.getHttpServer())
        .get('/service-orders')
        .query({ customerId: 'nonexistentid123' })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(otherRes.body).toHaveLength(0);
    });

    it('OPERATOR — filters by status', async () => {
      await request(app.getHttpServer())
        .post('/service-orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(orderPayload())
        .expect(201);

      const received = await request(app.getHttpServer())
        .get('/service-orders')
        .query({ status: 'RECEIVED' })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(received.body).toHaveLength(1);

      const ready = await request(app.getHttpServer())
        .get('/service-orders')
        .query({ status: 'READY' })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(ready.body).toHaveLength(0);
    });

    it('OPERATOR — filters by estimated delivery date range', async () => {
      await request(app.getHttpServer())
        .post('/service-orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(orderPayload({ estimatedDeliveryAt: '2026-08-01T00:00:00.000Z' }))
        .expect(201);

      const inRange = await request(app.getHttpServer())
        .get('/service-orders')
        .query({
          estimatedDeliveryFrom: '2026-07-01T00:00:00.000Z',
          estimatedDeliveryTo: '2026-09-01T00:00:00.000Z',
        })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(inRange.body).toHaveLength(1);

      const outOfRange = await request(app.getHttpServer())
        .get('/service-orders')
        .query({
          estimatedDeliveryFrom: '2026-09-01T00:00:00.000Z',
          estimatedDeliveryTo: '2026-10-01T00:00:00.000Z',
        })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(outOfRange.body).toHaveLength(0);
    });

    it('USER — cannot list service orders (403)', async () => {
      await request(app.getHttpServer())
        .get('/service-orders')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('unauthenticated — returns 401', async () => {
      await request(app.getHttpServer()).get('/service-orders').expect(401);
    });
  });

  // ─── GET /service-orders/:id ────────────────────────────────────────────────

  describe('GET /service-orders/:id', () => {
    it('OPERATOR — returns a service order by id', async () => {
      const created = await request(app.getHttpServer())
        .post('/service-orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(orderPayload())
        .expect(201);

      const res = await request(app.getHttpServer())
        .get(`/service-orders/${created.body.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toMatchObject({ id: created.body.id });
    });

    it('OPERATOR — returns 404 for non-existent order', async () => {
      await request(app.getHttpServer())
        .get('/service-orders/nonexistentid123')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  // ─── PATCH /service-orders/:id ───────────────────────────────────────────────

  describe('PATCH /service-orders/:id', () => {
    it('OPERATOR — updates estimatedDeliveryAt and observations', async () => {
      const created = await request(app.getHttpServer())
        .post('/service-orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(orderPayload())
        .expect(201);

      const res = await request(app.getHttpServer())
        .patch(`/service-orders/${created.body.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ estimatedDeliveryAt: '2026-09-01T00:00:00.000Z', observations: 'Cuidado' })
        .expect(200);

      expect(res.body.observations).toBe('Cuidado');
      expect(new Date(res.body.estimatedDeliveryAt).toISOString()).toBe('2026-09-01T00:00:00.000Z');
    });

    it('OPERATOR — updates finalTotal and recalculates discount', async () => {
      const created = await request(app.getHttpServer())
        .post('/service-orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(orderPayload())
        .expect(201);

      const res = await request(app.getHttpServer())
        .patch(`/service-orders/${created.body.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ finalTotal: 70 })
        .expect(200);

      expect(Number(res.body.finalTotal)).toBe(70);
      expect(Number(res.body.discount)).toBe(10);
    });

    it('OPERATOR — returns 404 for non-existent order', async () => {
      await request(app.getHttpServer())
        .patch('/service-orders/nonexistentid123')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ observations: 'x' })
        .expect(404);
    });

    it('OPERATOR — cannot update a delivered order', async () => {
      const created = await request(app.getHttpServer())
        .post('/service-orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(orderPayload())
        .expect(201);

      await request(app.getHttpServer())
        .post(`/service-orders/${created.body.id}/deliver`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(201);

      await request(app.getHttpServer())
        .patch(`/service-orders/${created.body.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ observations: 'x' })
        .expect(400);
    });

    it('USER — cannot update a service order (403)', async () => {
      const created = await request(app.getHttpServer())
        .post('/service-orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(orderPayload())
        .expect(201);

      await request(app.getHttpServer())
        .patch(`/service-orders/${created.body.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ observations: 'x' })
        .expect(403);
    });
  });

  // ─── PATCH /service-orders/:id/items/:itemId ────────────────────────────────

  describe('PATCH /service-orders/:id/items/:itemId', () => {
    it('OPERATOR — transitions item status RECEIVED -> WASHING and derives order status', async () => {
      const created = await request(app.getHttpServer())
        .post('/service-orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(orderPayload())
        .expect(201);

      const itemId = created.body.items[0].id;

      const res = await request(app.getHttpServer())
        .patch(`/service-orders/${created.body.id}/items/${itemId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'WASHING' })
        .expect(200);

      expect(res.body.status).toBe('WASHING');
      expect(res.body.items[0].status).toBe('WASHING');
    });

    it('OPERATOR — rejects an invalid status transition (400)', async () => {
      const created = await request(app.getHttpServer())
        .post('/service-orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(orderPayload())
        .expect(201);

      const itemId = created.body.items[0].id;

      await request(app.getHttpServer())
        .patch(`/service-orders/${created.body.id}/items/${itemId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'READY' })
        .expect(400);
    });

    it('OPERATOR — updates finalPrice and recalculates order totals', async () => {
      const created = await request(app.getHttpServer())
        .post('/service-orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(orderPayload())
        .expect(201);

      const itemId = created.body.items[0].id;

      const res = await request(app.getHttpServer())
        .patch(`/service-orders/${created.body.id}/items/${itemId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ finalPrice: 35 })
        .expect(200);

      expect(Number(res.body.finalTotal)).toBe(70);
      expect(Number(res.body.discount)).toBe(10);
    });

    it('OPERATOR — returns 404 when item does not belong to order', async () => {
      const created = await request(app.getHttpServer())
        .post('/service-orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(orderPayload())
        .expect(201);

      await request(app.getHttpServer())
        .patch(`/service-orders/${created.body.id}/items/nonexistentid123`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'WASHING' })
        .expect(404);
    });

    it('USER — cannot update an item (403)', async () => {
      const created = await request(app.getHttpServer())
        .post('/service-orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(orderPayload())
        .expect(201);

      const itemId = created.body.items[0].id;

      await request(app.getHttpServer())
        .patch(`/service-orders/${created.body.id}/items/${itemId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ status: 'WASHING' })
        .expect(403);
    });
  });

  // ─── POST /service-orders/:id/deliver ───────────────────────────────────────

  describe('POST /service-orders/:id/deliver', () => {
    it('OPERATOR — marks order as DELIVERED', async () => {
      const created = await request(app.getHttpServer())
        .post('/service-orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(orderPayload())
        .expect(201);

      const res = await request(app.getHttpServer())
        .post(`/service-orders/${created.body.id}/deliver`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(201);

      expect(res.body.status).toBe('DELIVERED');
    });

    it('OPERATOR — cannot deliver a cancelled order (400)', async () => {
      const created = await request(app.getHttpServer())
        .post('/service-orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(orderPayload())
        .expect(201);

      await request(app.getHttpServer())
        .post(`/service-orders/${created.body.id}/cancel`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(201);

      await request(app.getHttpServer())
        .post(`/service-orders/${created.body.id}/deliver`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });

    it('USER — cannot deliver an order (403)', async () => {
      const created = await request(app.getHttpServer())
        .post('/service-orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(orderPayload())
        .expect(201);

      await request(app.getHttpServer())
        .post(`/service-orders/${created.body.id}/deliver`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });
  });

  // ─── POST /service-orders/:id/cancel ────────────────────────────────────────

  describe('POST /service-orders/:id/cancel', () => {
    it('OPERATOR — marks order as CANCELLED', async () => {
      const created = await request(app.getHttpServer())
        .post('/service-orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(orderPayload())
        .expect(201);

      const res = await request(app.getHttpServer())
        .post(`/service-orders/${created.body.id}/cancel`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(201);

      expect(res.body.status).toBe('CANCELLED');
    });

    it('OPERATOR — cannot cancel a delivered order (400)', async () => {
      const created = await request(app.getHttpServer())
        .post('/service-orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(orderPayload())
        .expect(201);

      await request(app.getHttpServer())
        .post(`/service-orders/${created.body.id}/deliver`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(201);

      await request(app.getHttpServer())
        .post(`/service-orders/${created.body.id}/cancel`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });

    it('USER — cannot cancel an order (403)', async () => {
      const created = await request(app.getHttpServer())
        .post('/service-orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(orderPayload())
        .expect(201);

      await request(app.getHttpServer())
        .post(`/service-orders/${created.body.id}/cancel`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });
  });

  // ─── DELETE /service-orders/:id ──────────────────────────────────────────────

  describe('DELETE /service-orders/:id', () => {
    it('OPERATOR — soft-deletes a service order', async () => {
      const created = await request(app.getHttpServer())
        .post('/service-orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(orderPayload())
        .expect(201);

      await request(app.getHttpServer())
        .delete(`/service-orders/${created.body.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Record still exists in the database — soft-deleted, not removed
      const stillExists = await prisma.serviceOrder.findUnique({
        where: { id: created.body.id },
      });
      expect(stillExists).not.toBeNull();
      expect(stillExists?.deletedAt).not.toBeNull();
    });

    it('USER — cannot delete a service order (403)', async () => {
      const created = await request(app.getHttpServer())
        .post('/service-orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(orderPayload())
        .expect(201);

      await request(app.getHttpServer())
        .delete(`/service-orders/${created.body.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('unauthenticated — returns 401', async () => {
      await request(app.getHttpServer()).delete('/service-orders/nonexistentid123').expect(401);
    });

    it('OPERATOR — returns 404 when deleting non-existent order', async () => {
      await request(app.getHttpServer())
        .delete('/service-orders/nonexistentid123')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });
});
