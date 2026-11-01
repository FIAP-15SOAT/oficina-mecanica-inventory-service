import type { Server } from 'http';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import request from 'supertest';

import { UserRole } from '@domain/enums/user-role.enum';

import { cleanDatabase } from '../helpers/db-cleanup.helper';
import { signTestStaffToken } from '../helpers/staff-jwt.helper';
import { TestContext, setupTestApp, teardownTestApp } from '../helpers/test-app.helper';

const UNKNOWN_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const FIXED_DATE = new Date('2026-10-25T13:00:00.000Z');

interface Fixture {
  data: Record<string, unknown> & { id: string };
}

function loadFixture(name: string): Fixture {
  const { $source, $description, ...contract } = JSON.parse(
    readFileSync(join(__dirname, '../contracts', name), 'utf8'),
  ) as Record<string, unknown>;

  void $source;
  void $description;

  return contract as unknown as Fixture;
}

const serviceFixture = loadFixture('internal-service.json');
const partSupplyFixture = loadFixture('internal-part-supply.json');

describe('Internal routes (E2E)', () => {
  let ctx: TestContext;
  let httpServer: Server;

  const adminToken = (): string =>
    signTestStaffToken({ sub: 'staff-admin', email: 'admin@e2e.test', role: UserRole.ADMIN });

  beforeAll(async () => {
    ctx = await setupTestApp({ withSwagger: true });
    httpServer = ctx.httpServer;
  });

  afterAll(async () => {
    await teardownTestApp(ctx);
  });

  beforeEach(async () => {
    await cleanDatabase(ctx.prisma);
  });

  const seedService = () =>
    ctx.prisma.service.create({
      data: {
        id: serviceFixture.data.id,
        name: 'Troca de Óleo Interna',
        description: 'Troca completa com filtro',
        basePrice: 129.9,
        estimatedTimeMin: 60,
        createdAt: FIXED_DATE,
        updatedAt: FIXED_DATE,
      },
    });

  const seedPartSupply = () =>
    ctx.prisma.partSupply.create({
      data: {
        id: partSupplyFixture.data.id,
        name: 'Filtro de Óleo Interno',
        description: 'Filtro para motor 1.0',
        sku: 'FO-INT-001',
        partNumber: 'MANN-W712',
        category: 'PART',
        unit: 'UN',
        costPrice: 25,
        salePrice: 45,
        stock: 10,
        minStock: 2,
        reservedStock: 3,
        createdAt: FIXED_DATE,
        updatedAt: FIXED_DATE,
      },
    });

  describe('GET /internal/services/:id', () => {
    it('should return the service without a token, equal to the contract fixture', async () => {
      await seedService();

      const res = await request(httpServer)
        .get(`/internal/services/${serviceFixture.data.id}`)
        .expect(200);

      expect(res.body).toEqual(serviceFixture);
    });

    it('should return the same body as the public route', async () => {
      await seedService();

      const publicRes = await request(httpServer)
        .get(`/api/services/${serviceFixture.data.id}`)
        .set('Authorization', `Bearer ${adminToken()}`)
        .expect(200);

      expect(publicRes.body).toEqual(serviceFixture);
    });

    it('should answer 404 with the error body for an unknown id', async () => {
      const res = await request(httpServer).get(`/internal/services/${UNKNOWN_ID}`).expect(404);

      expect(res.body).toEqual({
        statusCode: 404,
        error: 'Not Found',
        message: expect.any(String),
      });
    });

    it('should answer 400 for an invalid id', async () => {
      await request(httpServer).get('/internal/services/not-a-uuid').expect(400);
    });

    it('should keep the public route behind the token', async () => {
      await request(httpServer).get(`/api/services/${serviceFixture.data.id}`).expect(401);
    });

    it('should not serve the internal route under /api', async () => {
      await request(httpServer)
        .get(`/api/internal/services/${serviceFixture.data.id}`)
        .set('Authorization', `Bearer ${adminToken()}`)
        .expect(404);
    });

    it('should return the new value after an update (cache invalidated)', async () => {
      await seedService();

      await request(httpServer).get(`/internal/services/${serviceFixture.data.id}`).expect(200);

      await request(httpServer)
        .put(`/api/services/${serviceFixture.data.id}`)
        .set('Authorization', `Bearer ${adminToken()}`)
        .send({
          name: 'Troca de Óleo Interna',
          description: 'Troca completa com filtro',
          basePrice: 150,
          estimatedTimeMin: 60,
        })
        .expect(200);

      const res = await request(httpServer)
        .get(`/internal/services/${serviceFixture.data.id}`)
        .expect(200);

      expect(res.body.data.basePrice).toBe(150);
    });
  });

  describe('GET /internal/parts-supplies/:id', () => {
    it('should return the part/supply without a token, equal to the contract fixture', async () => {
      await seedPartSupply();

      const res = await request(httpServer)
        .get(`/internal/parts-supplies/${partSupplyFixture.data.id}`)
        .expect(200);

      expect(res.body).toEqual(partSupplyFixture);
      expect(res.body.data.reservedStock).toBeGreaterThan(0);
    });

    it('should return the same body as the public route', async () => {
      await seedPartSupply();

      const publicRes = await request(httpServer)
        .get(`/api/parts-supplies/${partSupplyFixture.data.id}`)
        .set('Authorization', `Bearer ${adminToken()}`)
        .expect(200);

      expect(publicRes.body).toEqual(partSupplyFixture);
    });

    it('should answer 404 with the error body for an unknown id', async () => {
      const res = await request(httpServer)
        .get(`/internal/parts-supplies/${UNKNOWN_ID}`)
        .expect(404);

      expect(res.body).toEqual({
        statusCode: 404,
        error: 'Not Found',
        message: expect.any(String),
      });
    });

    it('should answer 400 for an invalid id', async () => {
      await request(httpServer).get('/internal/parts-supplies/not-a-uuid').expect(400);
    });

    it('should keep the public route behind the token', async () => {
      await request(httpServer).get(`/api/parts-supplies/${partSupplyFixture.data.id}`).expect(401);
    });

    it('should return the new balance after a movement (cache invalidated)', async () => {
      await seedPartSupply();

      await request(httpServer)
        .get(`/internal/parts-supplies/${partSupplyFixture.data.id}`)
        .expect(200);

      await request(httpServer)
        .patch(`/api/parts-supplies/${partSupplyFixture.data.id}`)
        .set('Authorization', `Bearer ${adminToken()}`)
        .send({ type: 'ENTRY', quantity: 5, reason: 'Reposição recebida' })
        .expect(200);

      const res = await request(httpServer)
        .get(`/internal/parts-supplies/${partSupplyFixture.data.id}`)
        .expect(200);

      expect(res.body.data.stock).toBe(15);
    });
  });

  describe('Swagger', () => {
    it('should leave both internal routes out of the API docs', async () => {
      const res = await request(httpServer).get('/api/docs-json').expect(200);

      const internalPaths = Object.keys(res.body.paths as object).filter((path) =>
        path.includes('/internal'),
      );

      expect(internalPaths).toEqual([]);
    });
  });
});
