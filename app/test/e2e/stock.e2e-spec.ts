import type { Server } from 'http';
import request from 'supertest';

import { randomUUID } from 'node:crypto';

import { StockMovementType } from '@domain/enums/stock-movement-type.enum';
import { UserRole } from '@domain/enums/user-role.enum';

import { cleanDatabase } from '../helpers/db-cleanup.helper';
import { signTestStaffToken } from '../helpers/staff-jwt.helper';
import { TestContext, setupTestApp, teardownTestApp } from '../helpers/test-app.helper';

describe('Stock listings (E2E)', () => {
  let ctx: TestContext;
  let httpServer: Server;

  const tokenFor = (role: UserRole): string =>
    signTestStaffToken({ sub: `staff-${role}`, email: `${role.toLowerCase()}@e2e.test`, role });

  const adminToken = (): string => tokenFor(UserRole.ADMIN);
  const attendantToken = (): string => tokenFor(UserRole.ATTENDANT);

  const FOREIGN_FIELDS = ['workOrder', 'customer', 'vehicle', 'assignedUser'];

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

  const createPart = (sku: string) =>
    ctx.prisma.partSupply.create({
      data: {
        name: `Peça ${sku}`,
        description: 'Descrição',
        sku,
        partNumber: `PN-${sku}`,
        category: 'PART',
        unit: 'UN',
        costPrice: 25,
        salePrice: 45,
        stock: 10,
        minStock: 2,
      },
    });

  const createMovement = (
    partSupplyId: string,
    overrides: Partial<{
      workOrderId: string | null;
      type: StockMovementType;
      quantity: number;
      reason: string | null;
      createdAt: Date;
    }> = {},
  ) =>
    ctx.prisma.stockMovement.create({
      data: {
        partSupplyId,
        workOrderId: null,
        type: StockMovementType.ENTRY,
        quantity: 5,
        reason: 'Reposição',
        ...overrides,
      },
    });

  const createReservation = (
    partSupplyId: string,
    workOrderId: string,
    overrides: Partial<{ quantity: number; createdAt: Date }> = {},
  ) =>
    ctx.prisma.stockReservation.create({
      data: { partSupplyId, workOrderId, quantity: 2, ...overrides },
    });

  // ─── GET /api/stock-movements ─────────────────────────────────────────────

  describe('GET /api/stock-movements', () => {
    it('should return an empty page when there are no movements', async () => {
      const res = await request(httpServer)
        .get('/api/stock-movements')
        .set('Authorization', `Bearer ${adminToken()}`)
        .expect(200);

      expect(res.body.data).toEqual([]);
      expect(res.body.pagination).toEqual({ totalRecords: 0, totalPages: 0, page: 1, limit: 10 });
    });

    it('should return the movement with the part summary and the work order reference only', async () => {
      const part = await createPart('SM-001');
      const workOrderId = randomUUID();
      const movement = await createMovement(part.id, {
        workOrderId,
        type: StockMovementType.EXIT,
        quantity: 3,
        reason: 'Saída por Ordem de Serviço',
      });

      const res = await request(httpServer)
        .get('/api/stock-movements')
        .set('Authorization', `Bearer ${attendantToken()}`)
        .expect(200);

      expect(res.body.data).toHaveLength(1);
      const [item] = res.body.data;
      expect(item).toEqual({
        id: movement.id,
        partSupplyId: part.id,
        partSupply: {
          id: part.id,
          name: 'Peça SM-001',
          description: 'Descrição',
          sku: 'SM-001',
          partNumber: 'PN-SM-001',
          category: 'PART',
          unit: 'UN',
        },
        workOrderId,
        type: 'EXIT',
        quantity: 3,
        reason: 'Saída por Ordem de Serviço',
        createdAt: expect.any(String),
      });
      for (const field of FOREIGN_FIELDS) {
        expect(item).not.toHaveProperty(field);
      }
    });

    it('should return workOrderId null for movements without a work order', async () => {
      const part = await createPart('SM-002');
      await createMovement(part.id);

      const res = await request(httpServer)
        .get('/api/stock-movements')
        .set('Authorization', `Bearer ${adminToken()}`)
        .expect(200);

      expect(res.body.data[0].workOrderId).toBeNull();
    });

    it('should paginate the results', async () => {
      const part = await createPart('SM-003');
      for (let i = 0; i < 3; i++) {
        await createMovement(part.id, { createdAt: new Date(`2026-01-0${i + 1}T12:00:00.000Z`) });
      }

      const res = await request(httpServer)
        .get('/api/stock-movements?page=2&limit=2')
        .set('Authorization', `Bearer ${adminToken()}`)
        .expect(200);

      expect(res.body.data).toHaveLength(1);
      expect(res.body.pagination).toEqual({ totalRecords: 3, totalPages: 2, page: 2, limit: 2 });
    });

    it('should filter by partSupplyId', async () => {
      const partA = await createPart('SM-A');
      const partB = await createPart('SM-B');
      await createMovement(partA.id);
      await createMovement(partB.id);

      const res = await request(httpServer)
        .get(`/api/stock-movements?partSupplyId=${partB.id}`)
        .set('Authorization', `Bearer ${adminToken()}`)
        .expect(200);

      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].partSupplyId).toBe(partB.id);
    });

    it('should filter by workOrderId', async () => {
      const part = await createPart('SM-004');
      const workOrderId = randomUUID();
      await createMovement(part.id, { workOrderId, type: StockMovementType.EXIT });
      await createMovement(part.id, { workOrderId: randomUUID(), type: StockMovementType.EXIT });
      await createMovement(part.id);

      const res = await request(httpServer)
        .get(`/api/stock-movements?workOrderId=${workOrderId}`)
        .set('Authorization', `Bearer ${adminToken()}`)
        .expect(200);

      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].workOrderId).toBe(workOrderId);
    });

    it('should filter by type', async () => {
      const part = await createPart('SM-005');
      await createMovement(part.id, { type: StockMovementType.ENTRY });
      await createMovement(part.id, { type: StockMovementType.EXIT });
      await createMovement(part.id, { type: StockMovementType.ADJUSTMENT });

      const res = await request(httpServer)
        .get('/api/stock-movements?type=ADJUSTMENT')
        .set('Authorization', `Bearer ${adminToken()}`)
        .expect(200);

      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].type).toBe('ADJUSTMENT');
    });

    it('should filter by date range including the whole final day', async () => {
      const part = await createPart('SM-006');
      await createMovement(part.id, { createdAt: new Date('2026-03-09T23:59:59.999Z') });
      const first = await createMovement(part.id, {
        createdAt: new Date('2026-03-10T00:00:00.000Z'),
      });
      const mid = await createMovement(part.id, {
        createdAt: new Date('2026-03-11T12:00:00.000Z'),
      });
      const last = await createMovement(part.id, {
        createdAt: new Date('2026-03-12T23:59:59.999Z'),
      });
      await createMovement(part.id, { createdAt: new Date('2026-03-13T00:00:00.000Z') });

      const res = await request(httpServer)
        .get('/api/stock-movements?startDate=2026-03-10&endDate=2026-03-12')
        .set('Authorization', `Bearer ${adminToken()}`)
        .expect(200);

      expect(res.body.data.map((m: { id: string }) => m.id)).toEqual([last.id, mid.id, first.id]);
    });

    it('should return 400 for a date in an invalid format', async () => {
      await request(httpServer)
        .get('/api/stock-movements?startDate=10/03/2026')
        .set('Authorization', `Bearer ${adminToken()}`)
        .expect(400);

      await request(httpServer)
        .get('/api/stock-movements?endDate=2026-3-1')
        .set('Authorization', `Bearer ${adminToken()}`)
        .expect(400);
    });

    it('should return 403 for MECHANIC', async () => {
      await request(httpServer)
        .get('/api/stock-movements')
        .set('Authorization', `Bearer ${tokenFor(UserRole.MECHANIC)}`)
        .expect(403);
    });

    it('should return 401 without token', async () => {
      await request(httpServer).get('/api/stock-movements').expect(401);
    });
  });

  // ─── GET /api/stock-reservations ──────────────────────────────────────────

  describe('GET /api/stock-reservations', () => {
    it('should return an empty page when there are no reservations', async () => {
      const res = await request(httpServer)
        .get('/api/stock-reservations')
        .set('Authorization', `Bearer ${adminToken()}`)
        .expect(200);

      expect(res.body.data).toEqual([]);
      expect(res.body.pagination).toEqual({ totalRecords: 0, totalPages: 0, page: 1, limit: 10 });
    });

    it('should return the reservation with the part summary and the work order reference only', async () => {
      const part = await createPart('SR-001');
      const workOrderId = randomUUID();
      const reservation = await createReservation(part.id, workOrderId, { quantity: 4 });

      const res = await request(httpServer)
        .get('/api/stock-reservations')
        .set('Authorization', `Bearer ${attendantToken()}`)
        .expect(200);

      expect(res.body.data).toHaveLength(1);
      const [item] = res.body.data;
      expect(item).toEqual({
        id: reservation.id,
        partSupplyId: part.id,
        partSupply: {
          id: part.id,
          name: 'Peça SR-001',
          description: 'Descrição',
          sku: 'SR-001',
          partNumber: 'PN-SR-001',
          category: 'PART',
          unit: 'UN',
        },
        workOrderId,
        quantity: 4,
        createdAt: expect.any(String),
      });
      for (const field of FOREIGN_FIELDS) {
        expect(item).not.toHaveProperty(field);
      }
    });

    it('should paginate the results', async () => {
      const part = await createPart('SR-002');
      for (let i = 0; i < 3; i++) {
        await createReservation(part.id, randomUUID());
      }

      const res = await request(httpServer)
        .get('/api/stock-reservations?page=2&limit=2')
        .set('Authorization', `Bearer ${adminToken()}`)
        .expect(200);

      expect(res.body.data).toHaveLength(1);
      expect(res.body.pagination).toEqual({ totalRecords: 3, totalPages: 2, page: 2, limit: 2 });
    });

    it('should filter by partSupplyId', async () => {
      const partA = await createPart('SR-A');
      const partB = await createPart('SR-B');
      await createReservation(partA.id, randomUUID());
      await createReservation(partB.id, randomUUID());

      const res = await request(httpServer)
        .get(`/api/stock-reservations?partSupplyId=${partA.id}`)
        .set('Authorization', `Bearer ${adminToken()}`)
        .expect(200);

      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].partSupplyId).toBe(partA.id);
    });

    it('should filter by workOrderId', async () => {
      const part = await createPart('SR-003');
      const workOrderId = randomUUID();
      await createReservation(part.id, workOrderId);
      await createReservation(part.id, randomUUID());

      const res = await request(httpServer)
        .get(`/api/stock-reservations?workOrderId=${workOrderId}`)
        .set('Authorization', `Bearer ${adminToken()}`)
        .expect(200);

      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].workOrderId).toBe(workOrderId);
    });

    it('should return 400 for an invalid workOrderId', async () => {
      await request(httpServer)
        .get('/api/stock-reservations?workOrderId=not-a-uuid')
        .set('Authorization', `Bearer ${adminToken()}`)
        .expect(400);
    });

    it('should return 403 for MECHANIC', async () => {
      await request(httpServer)
        .get('/api/stock-reservations')
        .set('Authorization', `Bearer ${tokenFor(UserRole.MECHANIC)}`)
        .expect(403);
    });

    it('should return 401 without token', async () => {
      await request(httpServer).get('/api/stock-reservations').expect(401);
    });
  });
});
