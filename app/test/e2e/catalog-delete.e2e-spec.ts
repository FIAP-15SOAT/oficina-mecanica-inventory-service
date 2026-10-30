import { createServer, Server as HttpServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { Server } from 'http';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import request from 'supertest';

import { UserRole } from '@domain/enums/user-role.enum';

import { cleanDatabase } from '../helpers/db-cleanup.helper';
import { signTestStaffToken } from '../helpers/staff-jwt.helper';
import { TestContext, setupTestApp, teardownTestApp } from '../helpers/test-app.helper';

const UNKNOWN_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

const { inUse, free, malformed } = JSON.parse(
  readFileSync(join(__dirname, '../contracts/quote-items.json'), 'utf8'),
) as { inUse: unknown; free: unknown; malformed: unknown };

type OwnerBehavior =
  | { kind: 'reply'; status: number; body: unknown }
  // Never answers: the client gives up at its 2 s deadline.
  | { kind: 'hang' };

// Stands in for the owner of the quotes (work-order until C-23, then Billing).
class QuoteOwnerStub {
  readonly requests: string[] = [];
  behavior: OwnerBehavior = { kind: 'reply', status: 200, body: free };
  private readonly server: HttpServer = createServer((req, res) => {
    this.requests.push(req.url ?? '');

    if (this.behavior.kind === 'hang') return;

    res.writeHead(this.behavior.status, { 'content-type': 'application/json' });
    res.end(JSON.stringify(this.behavior.body));
  });

  async start(): Promise<string> {
    await new Promise<void>((resolve) => this.server.listen(0, '127.0.0.1', resolve));

    return `http://127.0.0.1:${(this.server.address() as AddressInfo).port}`;
  }

  reset(): void {
    this.requests.length = 0;
    this.behavior = { kind: 'reply', status: 200, body: free };
  }

  async stop(): Promise<void> {
    this.server.closeAllConnections();
    await new Promise<void>((resolve) => this.server.close(() => resolve()));
  }
}

describe('Catalog delete (E2E)', () => {
  const owner = new QuoteOwnerStub();
  let ctx: TestContext;
  let httpServer: Server;

  const tokenFor = (role: UserRole): string =>
    signTestStaffToken({ sub: `staff-${role}`, email: `${role.toLowerCase()}@e2e.test`, role });
  const adminToken = (): string => tokenFor(UserRole.ADMIN);

  const createService = async (): Promise<string> => {
    const res = await request(httpServer)
      .post('/api/services')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ name: 'Troca de Óleo', basePrice: 129.9, estimatedTimeMin: 60 })
      .expect(201);

    return res.body.data.id as string;
  };

  const createPartSupply = async (): Promise<string> => {
    const res = await request(httpServer)
      .post('/api/parts-supplies')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({
        name: 'Filtro de Óleo',
        sku: 'FO-001',
        category: 'PART',
        unit: 'UN',
        costPrice: 25,
        salePrice: 45,
        stock: 10,
        minStock: 2,
      })
      .expect(201);

    return res.body.data.id as string;
  };

  const deleteService = (id: string, token: string = adminToken()) =>
    request(httpServer).delete(`/api/services/${id}`).set('Authorization', `Bearer ${token}`);

  const deletePartSupply = (id: string, token: string = adminToken()) =>
    request(httpServer).delete(`/api/parts-supplies/${id}`).set('Authorization', `Bearer ${token}`);

  // The internal read is cache-aside, so it also shows whether the cache key was dropped.
  const readInternal = (path: string) => request(httpServer).get(`/internal/${path}`);

  beforeAll(async () => {
    process.env.QUOTE_ITEMS_SERVICE_URL = await owner.start();
    ctx = await setupTestApp();
    httpServer = ctx.httpServer;
  });

  afterAll(async () => {
    await teardownTestApp(ctx);
    await owner.stop();
    delete process.env.QUOTE_ITEMS_SERVICE_URL;
  });

  beforeEach(async () => {
    owner.reset();
    await cleanDatabase(ctx.prisma);
  });

  describe('DELETE /api/services/:id', () => {
    it('should delete a service the owner reports as free, from the database and the cache', async () => {
      const id = await createService();
      await readInternal(`services/${id}`).expect(200);

      await deleteService(id).expect(204);

      expect(owner.requests).toEqual([`/internal/services/${id}/quote-items`]);
      expect(await ctx.prisma.service.count({ where: { id } })).toBe(0);
      await readInternal(`services/${id}`).expect(404);
    });

    it('should return 409 and keep the service when the owner reports quote items', async () => {
      const id = await createService();
      owner.behavior = { kind: 'reply', status: 200, body: inUse };

      const res = await deleteService(id).expect(409);

      expect(res.body.message).toContain('vinculado a ordens de serviço ou orçamentos');
      expect(await ctx.prisma.service.count({ where: { id } })).toBe(1);
      await readInternal(`services/${id}`).expect(200);
    });

    it('should return 503 and keep the service when the owner does not answer in time', async () => {
      const id = await createService();
      owner.behavior = { kind: 'hang' };

      await deleteService(id).expect(503);

      expect(await ctx.prisma.service.count({ where: { id } })).toBe(1);
    });

    it('should return 503 and keep the service when the owner fails', async () => {
      const id = await createService();
      owner.behavior = { kind: 'reply', status: 500, body: { message: 'boom' } };

      await deleteService(id).expect(503);

      expect(await ctx.prisma.service.count({ where: { id } })).toBe(1);
    });

    it('should return 503 and keep the service when the owner answers 200 with a malformed body', async () => {
      const id = await createService();
      owner.behavior = { kind: 'reply', status: 200, body: malformed };

      await deleteService(id).expect(503);

      expect(await ctx.prisma.service.count({ where: { id } })).toBe(1);
    });

    it('should relay a 4xx from the owner', async () => {
      const id = await createService();
      owner.behavior = { kind: 'reply', status: 404, body: { message: 'Rota não encontrada' } };

      await deleteService(id).expect(404);

      expect(await ctx.prisma.service.count({ where: { id } })).toBe(1);
    });

    it('should return 404 without asking the owner when the service does not exist', async () => {
      await deleteService(UNKNOWN_ID).expect(404);

      expect(owner.requests).toHaveLength(0);
    });

    it('should return 403 for a non-admin role and 401 without a token', async () => {
      const id = await createService();

      await deleteService(id, tokenFor(UserRole.ATTENDANT)).expect(403);
      await request(httpServer).delete(`/api/services/${id}`).expect(401);

      expect(owner.requests).toHaveLength(0);
      expect(await ctx.prisma.service.count({ where: { id } })).toBe(1);
    });
  });

  describe('DELETE /api/parts-supplies/:id', () => {
    it('should delete a part the owner reports as free, from the database and the cache', async () => {
      const id = await createPartSupply();
      await readInternal(`parts-supplies/${id}`).expect(200);

      await deletePartSupply(id).expect(204);

      expect(owner.requests).toEqual([`/internal/parts-supplies/${id}/quote-items`]);
      expect(await ctx.prisma.partSupply.count({ where: { id } })).toBe(0);
      await readInternal(`parts-supplies/${id}`).expect(404);
    });

    it('should return 409 and keep the part when the owner reports quote items', async () => {
      const id = await createPartSupply();
      owner.behavior = { kind: 'reply', status: 200, body: inUse };

      const res = await deletePartSupply(id).expect(409);

      expect(res.body.message).toContain('vinculado a ordens de serviço ou orçamentos');
      expect(await ctx.prisma.partSupply.count({ where: { id } })).toBe(1);
    });

    it('should return 503 and keep the part when the owner does not answer in time', async () => {
      const id = await createPartSupply();
      owner.behavior = { kind: 'hang' };

      await deletePartSupply(id).expect(503);

      expect(await ctx.prisma.partSupply.count({ where: { id } })).toBe(1);
    });

    it('should return 503 and keep the part when the owner fails', async () => {
      const id = await createPartSupply();
      owner.behavior = { kind: 'reply', status: 500, body: { message: 'boom' } };

      await deletePartSupply(id).expect(503);

      expect(await ctx.prisma.partSupply.count({ where: { id } })).toBe(1);
    });

    it('should return 503 and keep the part when the owner answers 200 with a malformed body', async () => {
      const id = await createPartSupply();
      owner.behavior = { kind: 'reply', status: 200, body: malformed };

      await deletePartSupply(id).expect(503);

      expect(await ctx.prisma.partSupply.count({ where: { id } })).toBe(1);
    });

    it('should relay a 4xx from the owner', async () => {
      const id = await createPartSupply();
      owner.behavior = { kind: 'reply', status: 404, body: { message: 'Rota não encontrada' } };

      await deletePartSupply(id).expect(404);

      expect(await ctx.prisma.partSupply.count({ where: { id } })).toBe(1);
    });

    it('should return 409 without asking the owner when stock is reserved', async () => {
      const id = await createPartSupply();
      await ctx.prisma.partSupply.update({ where: { id }, data: { reservedStock: 2 } });

      await deletePartSupply(id).expect(409);

      expect(owner.requests).toHaveLength(0);
      expect(await ctx.prisma.partSupply.count({ where: { id } })).toBe(1);
    });

    it('should return 409 instead of 500 when the part has stock movements', async () => {
      const id = await createPartSupply();
      await request(httpServer)
        .patch(`/api/parts-supplies/${id}`)
        .set('Authorization', `Bearer ${adminToken()}`)
        .send({ type: 'ENTRY', quantity: 5, reason: 'Reposição' })
        .expect(200);

      const res = await deletePartSupply(id).expect(409);

      expect(res.body.message).toBe(
        'Peça ou insumo não pode ser excluído pois possui movimentações de estoque ou reservas.',
      );
      expect(await ctx.prisma.partSupply.count({ where: { id } })).toBe(1);
    });

    it('should return 404 without asking the owner when the part does not exist', async () => {
      await deletePartSupply(UNKNOWN_ID).expect(404);

      expect(owner.requests).toHaveLength(0);
    });

    it('should return 403 for a non-admin role and 401 without a token', async () => {
      const id = await createPartSupply();

      await deletePartSupply(id, tokenFor(UserRole.ATTENDANT)).expect(403);
      await request(httpServer).delete(`/api/parts-supplies/${id}`).expect(401);

      expect(owner.requests).toHaveLength(0);
      expect(await ctx.prisma.partSupply.count({ where: { id } })).toBe(1);
    });
  });
});
