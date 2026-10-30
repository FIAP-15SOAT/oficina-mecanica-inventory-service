import type { Server } from 'http';
import request from 'supertest';

import { randomUUID } from 'node:crypto';

import { StockMovementType } from '@domain/enums/stock-movement-type.enum';
import { UserRole } from '@domain/enums/user-role.enum';
import { IUnitOfWork } from '@domain/interfaces/repositories/unit-of-work.interface';
import { ConcurrencyException } from '@infrastructure/exceptions/concurrency.exception';

import { cleanDatabase } from '../helpers/db-cleanup.helper';
import { signTestStaffToken } from '../helpers/staff-jwt.helper';
import { TestContext, setupTestApp, teardownTestApp } from '../helpers/test-app.helper';

describe('PartSupply (E2E)', () => {
  let ctx: TestContext;
  let httpServer: Server;

  const tokenFor = (role: UserRole): string =>
    signTestStaffToken({ sub: `staff-${role}`, email: `${role.toLowerCase()}@e2e.test`, role });

  const adminToken = (): string => tokenFor(UserRole.ADMIN);

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

  const validPartSupply = {
    name: 'Filtro de Óleo',
    description: 'Filtro para motor 1.0',
    sku: 'FO-001',
    category: 'PART',
    unit: 'UN',
    costPrice: 25.0,
    salePrice: 45.0,
    stock: 10,
    minStock: 2,
  };

  // ─── POST /api/parts-supplies ─────────────────────────────────────────────

  describe('POST /api/parts-supplies', () => {
    it('should create a part/supply and return 201', async () => {
      const res = await request(httpServer)
        .post('/api/parts-supplies')
        .set('Authorization', `Bearer ${adminToken()}`)
        .send(validPartSupply)
        .expect(201);

      expect(res.body.data).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          name: 'Filtro de Óleo',
          sku: 'FO-001',
          category: 'PART',
          unit: 'UN',
          stock: 10,
        }),
      );
    });

    it('should create with expiresAt and partNumber', async () => {
      const expiresAt = '2026-12-31';
      const res = await request(httpServer)
        .post('/api/parts-supplies')
        .set('Authorization', `Bearer ${adminToken()}`)
        .send({
          ...validPartSupply,
          sku: 'FO-EXPIRES-001',
          partNumber: 'MANN-W712',
          expiresAt,
        })
        .expect(201);

      expect(res.body.data.partNumber).toBe('MANN-W712');
      expect(res.body.data.expiresAt).toBeDefined();
      expect(new Date(res.body.data.expiresAt).toISOString().slice(0, 10)).toBe(expiresAt);
    });

    it('should create without optional fields', async () => {
      const res = await request(httpServer)
        .post('/api/parts-supplies')
        .set('Authorization', `Bearer ${adminToken()}`)
        .send({
          name: 'Óleo Motor 5W30',
          sku: 'OM-5W30',
          category: 'SUPPLY',
          unit: 'L',
          costPrice: 30.0,
          salePrice: 55.0,
        })
        .expect(201);

      expect(res.body.data.stock).toBe(0);
      expect(res.body.data.minStock).toBe(0);
      expect(res.body.data.description).toBeNull();
    });

    it('should return 409 when creating part/supply with duplicate SKU', async () => {
      await request(httpServer)
        .post('/api/parts-supplies')
        .set('Authorization', `Bearer ${adminToken()}`)
        .send(validPartSupply)
        .expect(201);

      await request(httpServer)
        .post('/api/parts-supplies')
        .set('Authorization', `Bearer ${adminToken()}`)
        .send({ ...validPartSupply, name: 'Outro Filtro' })
        .expect(409);
    });

    it('should return 400 with invalid body', async () => {
      await request(httpServer)
        .post('/api/parts-supplies')
        .set('Authorization', `Bearer ${adminToken()}`)
        .send({ name: '', sku: 'X', costPrice: -1, salePrice: 0 })
        .expect(400);
    });

    it('should return 400 when name is shorter than the minimum length', async () => {
      await request(httpServer)
        .post('/api/parts-supplies')
        .set('Authorization', `Bearer ${adminToken()}`)
        .send({ ...validPartSupply, name: 'ab' })
        .expect(400);
    });

    it('should return 400 when name exceeds the maximum length', async () => {
      await request(httpServer)
        .post('/api/parts-supplies')
        .set('Authorization', `Bearer ${adminToken()}`)
        .send({ ...validPartSupply, name: 'a'.repeat(151) })
        .expect(400);
    });

    it('should return 400 when description exceeds the maximum length', async () => {
      await request(httpServer)
        .post('/api/parts-supplies')
        .set('Authorization', `Bearer ${adminToken()}`)
        .send({ ...validPartSupply, description: 'a'.repeat(501) })
        .expect(400);
    });

    it('should return 400 when sku exceeds the maximum length', async () => {
      await request(httpServer)
        .post('/api/parts-supplies')
        .set('Authorization', `Bearer ${adminToken()}`)
        .send({ ...validPartSupply, sku: 'a'.repeat(61) })
        .expect(400);
    });

    it('should return 400 when partNumber exceeds the maximum length', async () => {
      await request(httpServer)
        .post('/api/parts-supplies')
        .set('Authorization', `Bearer ${adminToken()}`)
        .send({ ...validPartSupply, partNumber: 'a'.repeat(61) })
        .expect(400);
    });

    it('should return 400 when category is invalid', async () => {
      await request(httpServer)
        .post('/api/parts-supplies')
        .set('Authorization', `Bearer ${adminToken()}`)
        .send({ ...validPartSupply, category: 'INVALID' })
        .expect(400);
    });

    it('should return 400 when unit is invalid', async () => {
      await request(httpServer)
        .post('/api/parts-supplies')
        .set('Authorization', `Bearer ${adminToken()}`)
        .send({ ...validPartSupply, unit: 'INVALID' })
        .expect(400);
    });

    it('should return 400 when costPrice is negative', async () => {
      await request(httpServer)
        .post('/api/parts-supplies')
        .set('Authorization', `Bearer ${adminToken()}`)
        .send({ ...validPartSupply, costPrice: -1 })
        .expect(400);
    });

    it('should return 400 when salePrice is negative', async () => {
      await request(httpServer)
        .post('/api/parts-supplies')
        .set('Authorization', `Bearer ${adminToken()}`)
        .send({ ...validPartSupply, salePrice: -1 })
        .expect(400);
    });

    it('should return 400 when stock is negative', async () => {
      await request(httpServer)
        .post('/api/parts-supplies')
        .set('Authorization', `Bearer ${adminToken()}`)
        .send({ ...validPartSupply, stock: -1 })
        .expect(400);
    });

    it('should return 400 when minStock is negative', async () => {
      await request(httpServer)
        .post('/api/parts-supplies')
        .set('Authorization', `Bearer ${adminToken()}`)
        .send({ ...validPartSupply, minStock: -1 })
        .expect(400);
    });

    it('should return 400 when expiresAt is not a valid date string', async () => {
      await request(httpServer)
        .post('/api/parts-supplies')
        .set('Authorization', `Bearer ${adminToken()}`)
        .send({ ...validPartSupply, expiresAt: 'not-a-date' })
        .expect(400);
    });

    it('should return 401 without token', async () => {
      await request(httpServer).post('/api/parts-supplies').send(validPartSupply).expect(401);
    });

    it('should return 403 for non-admin role', async () => {
      await request(httpServer)
        .post('/api/parts-supplies')
        .set('Authorization', `Bearer ${tokenFor(UserRole.MECHANIC)}`)
        .send(validPartSupply)
        .expect(403);

      await request(httpServer)
        .post('/api/parts-supplies')
        .set('Authorization', `Bearer ${tokenFor(UserRole.ATTENDANT)}`)
        .send(validPartSupply)
        .expect(403);
    });
  });

  // ─── GET /api/parts-supplies ──────────────────────────────────────────────

  describe('GET /api/parts-supplies', () => {
    beforeEach(async () => {
      for (let i = 1; i <= 12; i++) {
        await request(httpServer)
          .post('/api/parts-supplies')
          .set('Authorization', `Bearer ${adminToken()}`)
          .send({
            name: `Peça ${i}`,
            sku: `SKU-${String(i).padStart(3, '0')}`,
            category: i % 2 === 0 ? 'SUPPLY' : 'PART',
            unit: 'UN',
            costPrice: 10 + i,
            salePrice: 20 + i,
            stock: i,
            minStock: 5,
          })
          .expect(201);
      }
    });

    it('should return paginated items with defaults (page=1, limit=10)', async () => {
      const res = await request(httpServer)
        .get('/api/parts-supplies')
        .set('Authorization', `Bearer ${adminToken()}`)
        .expect(200);

      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBe(10);
      expect(res.body.pagination.totalRecords).toBe(12);
      expect(res.body.pagination.totalPages).toBe(2);
    });

    it('should use default pagination (page=1, limit=10) when not provided', async () => {
      const res = await request(httpServer)
        .get('/api/parts-supplies')
        .set('Authorization', `Bearer ${adminToken()}`)
        .expect(200);

      expect(res.body.pagination.page).toBe(1);
      expect(res.body.pagination.limit).toBe(10);
    });

    it('should return second page', async () => {
      const res = await request(httpServer)
        .get('/api/parts-supplies?page=2&limit=10')
        .set('Authorization', `Bearer ${adminToken()}`)
        .expect(200);

      expect(res.body.data.length).toBe(2);
    });

    it('should filter by name', async () => {
      const res = await request(httpServer)
        .get('/api/parts-supplies?name=Peça 1')
        .set('Authorization', `Bearer ${adminToken()}`)
        .expect(200);

      expect(res.body.pagination.totalRecords).toBeGreaterThanOrEqual(1);
      res.body.data.forEach((item: { name: string }) => {
        expect(item.name).toContain('Peça 1');
      });
    });

    it('should filter by SKU', async () => {
      const res = await request(httpServer)
        .get('/api/parts-supplies?sku=SKU-001')
        .set('Authorization', `Bearer ${adminToken()}`)
        .expect(200);

      expect(res.body.pagination.totalRecords).toBe(1);
      expect(res.body.data[0].sku).toBe('SKU-001');
    });

    it('should filter by category', async () => {
      const res = await request(httpServer)
        .get('/api/parts-supplies?category=PART')
        .set('Authorization', `Bearer ${adminToken()}`)
        .expect(200);

      res.body.data.forEach((item: { category: string }) => {
        expect(item.category).toBe('PART');
      });
    });

    it('should filter low stock items (stock <= minStock)', async () => {
      // Items 1-5 have stock <= 5 (minStock=5)
      const res = await request(httpServer)
        .get('/api/parts-supplies?lowStock=true&limit=20')
        .set('Authorization', `Bearer ${adminToken()}`)
        .expect(200);

      expect(res.body.pagination.totalRecords).toBeGreaterThanOrEqual(1);
      res.body.data.forEach((item: { stock: number; minStock: number }) => {
        expect(item.stock).toBeLessThanOrEqual(item.minStock);
      });
    });

    it('should return all items when lowStock=false (no low-stock filter applied)', async () => {
      const res = await request(httpServer)
        .get('/api/parts-supplies?lowStock=false&limit=20')
        .set('Authorization', `Bearer ${adminToken()}`)
        .expect(200);

      expect(res.body.pagination.totalRecords).toBe(12);
    });

    it('should return 401 without token', async () => {
      await request(httpServer).get('/api/parts-supplies').expect(401);
    });
  });

  // ─── GET /api/parts-supplies/:id ─────────────────────────────────────────

  describe('GET /api/parts-supplies/:id', () => {
    it('should return a part/supply by id', async () => {
      const createRes = await request(httpServer)
        .post('/api/parts-supplies')
        .set('Authorization', `Bearer ${adminToken()}`)
        .send(validPartSupply)
        .expect(201);

      const partId = createRes.body.data.id;

      const res = await request(httpServer)
        .get(`/api/parts-supplies/${partId}`)
        .set('Authorization', `Bearer ${adminToken()}`)
        .expect(200);

      expect(res.body.data.id).toBe(partId);
      expect(res.body.data.name).toBe('Filtro de Óleo');
      expect(res.body.data.sku).toBe('FO-001');
    });

    it('should return 404 for non-existent id', async () => {
      await request(httpServer)
        .get('/api/parts-supplies/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken()}`)
        .expect(404);
    });

    it('should return 400 for invalid UUID', async () => {
      await request(httpServer)
        .get('/api/parts-supplies/not-a-uuid')
        .set('Authorization', `Bearer ${adminToken()}`)
        .expect(400);
    });
  });

  // ─── PUT /api/parts-supplies/:id ─────────────────────────────────────────

  describe('PUT /api/parts-supplies/:id', () => {
    let partId: string;

    beforeEach(async () => {
      const createRes = await request(httpServer)
        .post('/api/parts-supplies')
        .set('Authorization', `Bearer ${adminToken()}`)
        .send(validPartSupply)
        .expect(201);
      partId = createRes.body.data.id;
    });

    it('should update part/supply data', async () => {
      const { stock: _stock, ...updatePayload } = validPartSupply;

      const res = await request(httpServer)
        .put(`/api/parts-supplies/${partId}`)
        .set('Authorization', `Bearer ${adminToken()}`)
        .send({
          ...updatePayload,
          name: 'Filtro de Óleo Premium',
          salePrice: 59.9,
        })
        .expect(200);

      expect(res.body.data.name).toBe('Filtro de Óleo Premium');
      expect(res.body.data.salePrice).toBe(59.9);
    });

    it('should update part/supply with partNumber and expiresAt', async () => {
      const { stock: _stock, ...updatePayload } = validPartSupply;
      const expiresAt = '2027-06-30';

      const res = await request(httpServer)
        .put(`/api/parts-supplies/${partId}`)
        .set('Authorization', `Bearer ${adminToken()}`)
        .send({
          ...updatePayload,
          partNumber: 'MANN-W7050',
          expiresAt,
        })
        .expect(200);

      expect(res.body.data.partNumber).toBe('MANN-W7050');
      expect(res.body.data.expiresAt).toBeDefined();
      expect(new Date(res.body.data.expiresAt).toISOString().slice(0, 10)).toBe(expiresAt);
    });

    it('should return 409 when updating to a duplicate SKU', async () => {
      await request(httpServer)
        .post('/api/parts-supplies')
        .set('Authorization', `Bearer ${adminToken()}`)
        .send({ ...validPartSupply, name: 'Outro Item', sku: 'FO-002' })
        .expect(201);

      const { stock: _stock, ...updatePayload } = validPartSupply;

      await request(httpServer)
        .put(`/api/parts-supplies/${partId}`)
        .set('Authorization', `Bearer ${adminToken()}`)
        .send({ ...updatePayload, sku: 'FO-002' })
        .expect(409);
    });

    it('should update to a new free SKU without conflict', async () => {
      const { stock: _stock, ...updatePayload } = validPartSupply;

      // A SKU that no other part uses exercises the "no duplicate found" branch
      // of the SKU uniqueness lookup.
      const res = await request(httpServer)
        .put(`/api/parts-supplies/${partId}`)
        .set('Authorization', `Bearer ${adminToken()}`)
        .send({ ...updatePayload, sku: 'FO-NEW-999' })
        .expect(200);

      expect(res.body.data.sku).toBe('FO-NEW-999');
    });

    it('should return 404 for non-existent part/supply', async () => {
      const { stock: _stock, ...updatePayload } = validPartSupply;

      await request(httpServer)
        .put('/api/parts-supplies/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken()}`)
        .send(updatePayload)
        .expect(404);
    });

    it('should return 400 when updating with a name shorter than the minimum length', async () => {
      const { stock: _stock, ...updatePayload } = validPartSupply;

      await request(httpServer)
        .put(`/api/parts-supplies/${partId}`)
        .set('Authorization', `Bearer ${adminToken()}`)
        .send({ ...updatePayload, name: 'ab' })
        .expect(400);
    });

    it('should return 400 when updating with a name that exceeds the maximum length', async () => {
      const { stock: _stock, ...updatePayload } = validPartSupply;

      await request(httpServer)
        .put(`/api/parts-supplies/${partId}`)
        .set('Authorization', `Bearer ${adminToken()}`)
        .send({ ...updatePayload, name: 'a'.repeat(151) })
        .expect(400);
    });

    it('should return 400 when updating with a description that exceeds the maximum length', async () => {
      const { stock: _stock, ...updatePayload } = validPartSupply;

      await request(httpServer)
        .put(`/api/parts-supplies/${partId}`)
        .set('Authorization', `Bearer ${adminToken()}`)
        .send({ ...updatePayload, description: 'a'.repeat(501) })
        .expect(400);
    });
  });

  // ─── PATCH /api/parts-supplies/:id ───────────────────────────────────────

  describe('PATCH /api/parts-supplies/:id', () => {
    let partId: string;

    beforeEach(async () => {
      const createRes = await request(httpServer)
        .post('/api/parts-supplies')
        .set('Authorization', `Bearer ${adminToken()}`)
        .send(validPartSupply)
        .expect(201);
      partId = createRes.body.data.id;
    });

    it('should add stock with ENTRY movement', async () => {
      const res = await request(httpServer)
        .patch(`/api/parts-supplies/${partId}`)
        .set('Authorization', `Bearer ${adminToken()}`)
        .send({ type: 'ENTRY', quantity: 5, reason: 'Reposição recebida' })
        .expect(200);

      expect(res.body.data.stock).toBe(15);
    });

    it('should reduce stock with EXIT movement', async () => {
      const res = await request(httpServer)
        .patch(`/api/parts-supplies/${partId}`)
        .set('Authorization', `Bearer ${adminToken()}`)
        .send({ type: 'EXIT', quantity: 3, reason: 'Saída por OS' })
        .expect(200);

      expect(res.body.data.stock).toBe(7);
    });

    it('should adjust stock with ADJUSTMENT movement', async () => {
      const res = await request(httpServer)
        .patch(`/api/parts-supplies/${partId}`)
        .set('Authorization', `Bearer ${adminToken()}`)
        .send({ type: 'ADJUSTMENT', quantity: 2, reason: 'Ajuste de inventário' })
        .expect(200);

      expect(res.body.data.stock).toBe(2);
    });

    it('should return 409 when EXIT quantity exceeds available stock', async () => {
      await request(httpServer)
        .patch(`/api/parts-supplies/${partId}`)
        .set('Authorization', `Bearer ${adminToken()}`)
        .send({ type: 'EXIT', quantity: 999 })
        .expect(409);
    });

    it('should return 404 for non-existent part/supply', async () => {
      await request(httpServer)
        .patch('/api/parts-supplies/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken()}`)
        .send({ type: 'ENTRY', quantity: 1 })
        .expect(404);
    });

    it('should return 400 for invalid movement type', async () => {
      await request(httpServer)
        .patch(`/api/parts-supplies/${partId}`)
        .set('Authorization', `Bearer ${adminToken()}`)
        .send({ type: 'INVALID', quantity: 1 })
        .expect(400);
    });

    it('should allow ENTRY without reason (optional field)', async () => {
      const res = await request(httpServer)
        .patch(`/api/parts-supplies/${partId}`)
        .set('Authorization', `Bearer ${adminToken()}`)
        .send({ type: 'ENTRY', quantity: 2 })
        .expect(200);

      expect(res.body.data.stock).toBe(validPartSupply.stock + 2);
    });

    it('should return 400 when quantity is zero', async () => {
      await request(httpServer)
        .patch(`/api/parts-supplies/${partId}`)
        .set('Authorization', `Bearer ${adminToken()}`)
        .send({ type: 'ENTRY', quantity: 0 })
        .expect(400);
    });

    it('should return 400 when workOrderId is not a valid UUID', async () => {
      await request(httpServer)
        .patch(`/api/parts-supplies/${partId}`)
        .set('Authorization', `Bearer ${adminToken()}`)
        .send({ type: 'EXIT', quantity: 1, workOrderId: 'not-a-uuid' })
        .expect(400);
    });
  });

  // ─── PATCH /api/parts-supplies/:id — Concurrency (optimistic locking) ───────

  describe('PATCH /api/parts-supplies/:id — Concurrency (optimistic locking)', () => {
    it('should maintain stock consistency under concurrent EXIT operations', async () => {
      const initialStock = 100;
      const exitQty = 10;
      const concurrentCount = 5;

      const createRes = await request(httpServer)
        .post('/api/parts-supplies')
        .set('Authorization', `Bearer ${adminToken()}`)
        .send({ ...validPartSupply, sku: `CONC-EXIT-${Date.now()}`, stock: initialStock })
        .expect(201);

      const partId = createRes.body.data.id as string;

      const responses = await Promise.all(
        Array.from({ length: concurrentCount }, () =>
          request(httpServer)
            .patch(`/api/parts-supplies/${partId}`)
            .set('Authorization', `Bearer ${adminToken()}`)
            .send({ type: 'EXIT', quantity: exitQty, reason: 'Saída concorrente' }),
        ),
      );

      // No server error (500) allowed — only success (200) or conflict (409)
      responses.forEach((r) => expect([200, 409]).toContain(r.status));

      const successes = responses.filter((r) => r.status === 200);
      expect(successes.length).toBeGreaterThanOrEqual(1);

      // Final stock must equal initialStock minus exactly the quantity of successful exits
      const finalRecord = await ctx.prisma.partSupply.findUnique({ where: { id: partId } });

      expect(finalRecord!.stock).toBe(initialStock - exitQty * successes.length);
    });

    it('should maintain stock consistency under concurrent ENTRY operations', async () => {
      const initialStock = 50;
      const entryQty = 5;
      const concurrentCount = 5;

      const createRes = await request(httpServer)
        .post('/api/parts-supplies')
        .set('Authorization', `Bearer ${adminToken()}`)
        .send({ ...validPartSupply, sku: `CONC-ENTRY-${Date.now()}`, stock: initialStock })
        .expect(201);

      const partId = createRes.body.data.id as string;

      const responses = await Promise.all(
        Array.from({ length: concurrentCount }, () =>
          request(httpServer)
            .patch(`/api/parts-supplies/${partId}`)
            .set('Authorization', `Bearer ${adminToken()}`)
            .send({ type: 'ENTRY', quantity: entryQty, reason: 'Entrada concorrente' }),
        ),
      );

      responses.forEach((r) => expect([200, 409]).toContain(r.status));

      const successes = responses.filter((r) => r.status === 200);

      expect(successes.length).toBeGreaterThanOrEqual(1);

      const finalRecord = await ctx.prisma.partSupply.findUnique({ where: { id: partId } });

      expect(finalRecord!.stock).toBe(initialStock + entryQty * successes.length);
    });

    it('should reject a stale-version update with P2025 (direct optimistic lock verification)', async () => {
      const createRes = await request(httpServer)
        .post('/api/parts-supplies')
        .set('Authorization', `Bearer ${adminToken()}`)
        .send({ ...validPartSupply, sku: `STALE-${Date.now()}` })
        .expect(201);

      const partId = createRes.body.data.id as string;

      const before = await ctx.prisma.partSupply.findUniqueOrThrow({ where: { id: partId } });

      // Advance the version via HTTP
      await request(httpServer)
        .patch(`/api/parts-supplies/${partId}`)
        .set('Authorization', `Bearer ${adminToken()}`)
        .send({ type: 'ENTRY', quantity: 1, reason: 'Primeira atualização' })
        .expect(200);

      // Simulate a stale second transaction: commit using the now-obsolete version
      await expect(
        ctx.prisma.partSupply.update({
          where: { id: partId, version: before.version }, // stale — the version moved on
          data: { stock: { increment: 5 }, version: { increment: 1 } },
        }),
      ).rejects.toMatchObject({ code: 'P2025' });
    });
  });

  // ─── PATCH /api/parts-supplies/:id — Stale write (repository) ───────

  describe('PATCH /api/parts-supplies/:id — Stale write', () => {
    it('should throw ConcurrencyException when a stale entity is saved after another write', async () => {
      const createRes = await request(httpServer)
        .post('/api/parts-supplies')
        .set('Authorization', `Bearer ${adminToken()}`)
        .send(validPartSupply)
        .expect(201);

      const partId = createRes.body.data.id as string;
      const unitOfWork = ctx.app.get<IUnitOfWork>('IUnitOfWork');

      const stale = await unitOfWork.executeTransaction((repos) =>
        repos.partSupply.findById(partId),
      );

      await request(httpServer)
        .patch(`/api/parts-supplies/${partId}`)
        .set('Authorization', `Bearer ${adminToken()}`)
        .send({ type: 'ENTRY', quantity: 1 })
        .expect(200);

      stale!.applyStockMovement(StockMovementType.ENTRY, 1);

      await expect(
        unitOfWork.executeTransaction((repos) => repos.partSupply.update(stale!)),
      ).rejects.toBeInstanceOf(ConcurrencyException);

      const record = await ctx.prisma.partSupply.findUniqueOrThrow({ where: { id: partId } });

      expect(record.stock).toBe(validPartSupply.stock + 1);
    });
  });

  // ─── Reserved stock (rule 26) ─────────────────────────────────────────────

  describe('Reserved stock (rule 26)', () => {
    let partId: string;

    const patchStock = (body: object, token = adminToken()) =>
      request(httpServer)
        .patch(`/api/parts-supplies/${partId}`)
        .set('Authorization', `Bearer ${token}`)
        .send(body);

    beforeEach(async () => {
      const createRes = await request(httpServer)
        .post('/api/parts-supplies')
        .set('Authorization', `Bearer ${adminToken()}`)
        .send(validPartSupply)
        .expect(201);

      partId = createRes.body.data.id;

      await ctx.prisma.partSupply.update({ where: { id: partId }, data: { reservedStock: 8 } });
    });

    it('should expose reservedStock when reading by id', async () => {
      const res = await request(httpServer)
        .get(`/api/parts-supplies/${partId}`)
        .set('Authorization', `Bearer ${adminToken()}`)
        .expect(200);

      expect(res.body.data.stock).toBe(10);
      expect(res.body.data.reservedStock).toBe(8);
      expect(res.body.data).not.toHaveProperty('version');
    });

    it('should return 409 and keep the stock when EXIT would leave it below the reserved stock', async () => {
      await patchStock({ type: 'EXIT', quantity: 5 }).expect(409);

      const record = await ctx.prisma.partSupply.findUniqueOrThrow({ where: { id: partId } });

      expect(record.stock).toBe(10);
      expect(record.reservedStock).toBe(8);
      expect(await ctx.prisma.stockMovement.count({ where: { partSupplyId: partId } })).toBe(0);
    });

    it('should allow EXIT down to exactly the reserved stock', async () => {
      const res = await patchStock({ type: 'EXIT', quantity: 2 }).expect(200);

      expect(res.body.data.stock).toBe(8);
      expect(res.body.data.reservedStock).toBe(8);
    });

    it('should return 409 and keep the stock when ADJUSTMENT is below the reserved stock', async () => {
      await patchStock({ type: 'ADJUSTMENT', quantity: 7 }).expect(409);

      const record = await ctx.prisma.partSupply.findUniqueOrThrow({ where: { id: partId } });

      expect(record.stock).toBe(10);
      expect(await ctx.prisma.stockMovement.count({ where: { partSupplyId: partId } })).toBe(0);
    });

    it('should allow ADJUSTMENT equal to the reserved stock', async () => {
      const res = await patchStock({ type: 'ADJUSTMENT', quantity: 8 }).expect(200);

      expect(res.body.data.stock).toBe(8);
      expect(res.body.data.reservedStock).toBe(8);
    });

    it('should add stock with ENTRY without touching the reserved stock', async () => {
      const res = await patchStock({ type: 'ENTRY', quantity: 5 }).expect(200);

      expect(res.body.data.stock).toBe(15);
      expect(res.body.data.reservedStock).toBe(8);
    });
  });

  // ─── Movement audit and cache invalidation ────────────────────────────────

  describe('Stock movement record and cache', () => {
    let partId: string;

    beforeEach(async () => {
      const createRes = await request(httpServer)
        .post('/api/parts-supplies')
        .set('Authorization', `Bearer ${adminToken()}`)
        .send(validPartSupply)
        .expect(201);

      partId = createRes.body.data.id;
    });

    it('should persist the movement with the reason and the work order id', async () => {
      const workOrderId = randomUUID();

      await request(httpServer)
        .patch(`/api/parts-supplies/${partId}`)
        .set('Authorization', `Bearer ${adminToken()}`)
        .send({ type: 'EXIT', quantity: 3, reason: 'Saída manual', workOrderId })
        .expect(200);

      const movements = await ctx.prisma.stockMovement.findMany({
        where: { partSupplyId: partId },
      });

      expect(movements).toHaveLength(1);
      expect(movements[0]).toMatchObject({
        type: 'EXIT',
        quantity: 3,
        reason: 'Saída manual',
        workOrderId,
      });
    });

    it('should serve the new stock on the next read after a movement', async () => {
      const read = () =>
        request(httpServer)
          .get(`/api/parts-supplies/${partId}`)
          .set('Authorization', `Bearer ${adminToken()}`)
          .expect(200);

      expect((await read()).body.data.stock).toBe(10);

      await request(httpServer)
        .patch(`/api/parts-supplies/${partId}`)
        .set('Authorization', `Bearer ${adminToken()}`)
        .send({ type: 'ENTRY', quantity: 5 })
        .expect(200);

      expect((await read()).body.data.stock).toBe(15);
    });

    it('should serve the new data on the next read after an update', async () => {
      const read = () =>
        request(httpServer)
          .get(`/api/parts-supplies/${partId}`)
          .set('Authorization', `Bearer ${adminToken()}`)
          .expect(200);

      expect((await read()).body.data.name).toBe('Filtro de Óleo');

      const { stock: _stock, ...updatePayload } = validPartSupply;

      await request(httpServer)
        .put(`/api/parts-supplies/${partId}`)
        .set('Authorization', `Bearer ${adminToken()}`)
        .send({ ...updatePayload, name: 'Filtro Renomeado' })
        .expect(200);

      expect((await read()).body.data.name).toBe('Filtro Renomeado');
    });
  });

  // ─── Roles ────────────────────────────────────────────────────────────────

  describe('Roles', () => {
    let partId: string;

    beforeEach(async () => {
      const createRes = await request(httpServer)
        .post('/api/parts-supplies')
        .set('Authorization', `Bearer ${adminToken()}`)
        .send(validPartSupply)
        .expect(201);

      partId = createRes.body.data.id;
    });

    const as = (role: UserRole) => ({ Authorization: `Bearer ${tokenFor(role)}` });

    it('should let the mechanic list but not read by id, update or move stock', async () => {
      await request(httpServer).get('/api/parts-supplies').set(as(UserRole.MECHANIC)).expect(200);
      await request(httpServer)
        .get(`/api/parts-supplies/${partId}`)
        .set(as(UserRole.MECHANIC))
        .expect(403);
      await request(httpServer)
        .patch(`/api/parts-supplies/${partId}`)
        .set(as(UserRole.MECHANIC))
        .send({ type: 'ENTRY', quantity: 1 })
        .expect(403);
    });

    it('should let the attendant list, read by id and move stock but not update', async () => {
      await request(httpServer).get('/api/parts-supplies').set(as(UserRole.ATTENDANT)).expect(200);
      await request(httpServer)
        .get(`/api/parts-supplies/${partId}`)
        .set(as(UserRole.ATTENDANT))
        .expect(200);
      await request(httpServer)
        .patch(`/api/parts-supplies/${partId}`)
        .set(as(UserRole.ATTENDANT))
        .send({ type: 'ENTRY', quantity: 1 })
        .expect(200);

      const { stock: _stock, ...updatePayload } = validPartSupply;

      await request(httpServer)
        .put(`/api/parts-supplies/${partId}`)
        .set(as(UserRole.ATTENDANT))
        .send(updatePayload)
        .expect(403);
    });

    it('should return 401 without token on read by id, update and stock movement', async () => {
      await request(httpServer).get(`/api/parts-supplies/${partId}`).expect(401);
      await request(httpServer).put(`/api/parts-supplies/${partId}`).send({}).expect(401);
      await request(httpServer)
        .patch(`/api/parts-supplies/${partId}`)
        .send({ type: 'ENTRY', quantity: 1 })
        .expect(401);
    });
  });
});
