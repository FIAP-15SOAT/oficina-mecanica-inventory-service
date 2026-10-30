import type { Server } from 'http';
import request from 'supertest';

import { UserRole } from '@domain/enums/user-role.enum';

import { cleanDatabase } from '../helpers/db-cleanup.helper';
import { signTestStaffToken } from '../helpers/staff-jwt.helper';
import { TestContext, setupTestApp, teardownTestApp } from '../helpers/test-app.helper';

describe('Service (E2E)', () => {
  let ctx: TestContext;
  let httpServer: Server;

  const tokenFor = (role: UserRole): string =>
    signTestStaffToken({ sub: `staff-${role}`, email: `${role.toLowerCase()}@e2e.test`, role });

  const adminToken = (): string => tokenFor(UserRole.ADMIN);

  const validService = {
    name: 'Troca de Óleo',
    description: 'Troca completa com filtro',
    basePrice: 129.9,
    estimatedTimeMin: 60,
  };

  const createService = (body: object = validService) =>
    request(httpServer)
      .post('/api/services')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send(body);

  beforeAll(async () => {
    ctx = await setupTestApp();
    httpServer = ctx.httpServer;
  });

  afterAll(async () => {
    await teardownTestApp(ctx);
  });

  beforeEach(async () => {
    await cleanDatabase(ctx.prisma);
  });

  describe('POST /api/services', () => {
    it('should create a service and return 201', async () => {
      const res = await createService().expect(201);

      expect(res.body.data).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          name: 'Troca de Óleo',
          description: 'Troca completa com filtro',
          basePrice: 129.9,
          estimatedTimeMin: 60,
        }),
      );
    });

    it('should create a service without optional description', async () => {
      const res = await createService({
        name: 'Alinhamento',
        basePrice: 80,
        estimatedTimeMin: 30,
      }).expect(201);

      expect(res.body.data.name).toBe('Alinhamento');
      expect(res.body.data.description).toBeNull();
    });

    it('should return 409 when creating a service with a duplicate name', async () => {
      await createService().expect(201);
      await createService().expect(409);
    });

    it('should return 400 with invalid body', async () => {
      await createService({ name: 'ab', basePrice: -10, estimatedTimeMin: 0 }).expect(400);
    });

    it('should return 400 when name exceeds the maximum length', async () => {
      await createService({ ...validService, name: 'a'.repeat(151) }).expect(400);
    });

    it('should return 400 when description exceeds the maximum length', async () => {
      await createService({ ...validService, description: 'a'.repeat(501) }).expect(400);
    });

    it('should return 400 when estimatedTimeMin is zero', async () => {
      await createService({ ...validService, estimatedTimeMin: 0 }).expect(400);
    });

    it('should return 401 without token', async () => {
      await request(httpServer).post('/api/services').send(validService).expect(401);
    });

    it('should return 401 with a customer token', async () => {
      const customerToken = signTestStaffToken({
        sub: 'customer-1',
        email: 'customer@e2e.test',
        role: 'CUSTOMER',
      });

      await request(httpServer)
        .post('/api/services')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(validService)
        .expect(401);
    });

    it('should return 403 for a non-admin role', async () => {
      await request(httpServer)
        .post('/api/services')
        .set('Authorization', `Bearer ${tokenFor(UserRole.MECHANIC)}`)
        .send(validService)
        .expect(403);
    });
  });

  describe('GET /api/services', () => {
    beforeEach(async () => {
      for (let i = 1; i <= 15; i++) {
        await createService({
          name: `Serviço ${i}`,
          basePrice: 100 + i,
          estimatedTimeMin: 30 + i,
        }).expect(201);
      }
    });

    it('should return paginated services with defaults (page=1, limit=10)', async () => {
      const res = await request(httpServer)
        .get('/api/services')
        .set('Authorization', `Bearer ${adminToken()}`)
        .expect(200);

      expect(res.body.data).toHaveLength(10);
      expect(res.body.pagination).toEqual({ page: 1, limit: 10, totalRecords: 15, totalPages: 2 });
    });

    it('should return the second page', async () => {
      const res = await request(httpServer)
        .get('/api/services?page=2&limit=10')
        .set('Authorization', `Bearer ${adminToken()}`)
        .expect(200);

      expect(res.body.data).toHaveLength(5);
    });

    it('should respect a custom limit', async () => {
      const res = await request(httpServer)
        .get('/api/services?page=1&limit=5')
        .set('Authorization', `Bearer ${adminToken()}`)
        .expect(200);

      expect(res.body.data).toHaveLength(5);
      expect(res.body.pagination.totalPages).toBe(3);
    });

    it('should filter services by name (case-insensitive)', async () => {
      const res = await request(httpServer)
        .get('/api/services?name=servi%C3%A7o+1&limit=100')
        .set('Authorization', `Bearer ${adminToken()}`)
        .expect(200);

      expect(res.body.pagination.totalRecords).toBeGreaterThanOrEqual(1);
      res.body.data.forEach((item: { name: string }) => {
        expect(item.name.toLowerCase()).toContain('serviço 1');
      });
    });

    it.each([UserRole.ATTENDANT, UserRole.MECHANIC])('should allow %s to list', async (role) => {
      await request(httpServer)
        .get('/api/services')
        .set('Authorization', `Bearer ${tokenFor(role)}`)
        .expect(200);
    });

    it('should return 401 without token', async () => {
      await request(httpServer).get('/api/services').expect(401);
    });
  });

  describe('GET /api/services/:id', () => {
    it('should return the service by id', async () => {
      const serviceId = (await createService().expect(201)).body.data.id;

      const res = await request(httpServer)
        .get(`/api/services/${serviceId}`)
        .set('Authorization', `Bearer ${adminToken()}`)
        .expect(200);

      expect(res.body.data.id).toBe(serviceId);
      expect(res.body.data.name).toBe('Troca de Óleo');
    });

    it('should serve a repeated read from the cache and see the update afterwards', async () => {
      const serviceId = (await createService().expect(201)).body.data.id;
      const get = () =>
        request(httpServer)
          .get(`/api/services/${serviceId}`)
          .set('Authorization', `Bearer ${adminToken()}`)
          .expect(200);

      await get();
      expect((await get()).body.data.name).toBe('Troca de Óleo');

      await request(httpServer)
        .put(`/api/services/${serviceId}`)
        .set('Authorization', `Bearer ${adminToken()}`)
        .send({ ...validService, name: 'Troca de Óleo Premium' })
        .expect(200);

      expect((await get()).body.data.name).toBe('Troca de Óleo Premium');
    });

    it('should return 404 for a non-existent service', async () => {
      await request(httpServer)
        .get('/api/services/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken()}`)
        .expect(404);
    });

    it('should return 400 for an invalid UUID', async () => {
      await request(httpServer)
        .get('/api/services/not-a-uuid')
        .set('Authorization', `Bearer ${adminToken()}`)
        .expect(400);
    });

    it('should return 403 for a role without permission', async () => {
      await request(httpServer)
        .get('/api/services/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${tokenFor(UserRole.ATTENDANT)}`)
        .expect(403);
    });
  });

  describe('PUT /api/services/:id', () => {
    let serviceId: string;

    beforeEach(async () => {
      serviceId = (await createService().expect(201)).body.data.id;
    });

    const update = (id: string, body: object, token = adminToken()) =>
      request(httpServer)
        .put(`/api/services/${id}`)
        .set('Authorization', `Bearer ${token}`)
        .send(body);

    it('should update the service data', async () => {
      const res = await update(serviceId, {
        name: 'Troca de Óleo Premium',
        description: 'Com óleo sintético',
        basePrice: 189.9,
        estimatedTimeMin: 90,
      }).expect(200);

      expect(res.body.data.name).toBe('Troca de Óleo Premium');
      expect(res.body.data.description).toBe('Com óleo sintético');
    });

    it('should return 404 for a non-existent service', async () => {
      await update('00000000-0000-0000-0000-000000000000', {
        name: 'Ghost',
        basePrice: 100,
        estimatedTimeMin: 30,
      }).expect(404);
    });

    it('should return 400 when basePrice is negative', async () => {
      await update(serviceId, { ...validService, basePrice: -5 }).expect(400);
    });

    it('should return 409 when updating to the name of another service', async () => {
      await createService({ name: 'Outro Serviço', basePrice: 50, estimatedTimeMin: 20 }).expect(
        201,
      );

      await update(serviceId, {
        name: 'Outro Serviço',
        basePrice: 100,
        estimatedTimeMin: 30,
      }).expect(409);
    });

    it('should return 403 for a non-admin role', async () => {
      await update(serviceId, validService, tokenFor(UserRole.MECHANIC)).expect(403);
    });
  });
});
