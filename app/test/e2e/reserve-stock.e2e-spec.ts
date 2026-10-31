import { randomUUID } from 'node:crypto';

import { ReserveStockUseCase } from '@application/use-cases/stock/reserve-stock.use-case';
import { ICache } from '@application/ports/output/cache.service.interface';
import { IUnitOfWork } from '@domain/interfaces/repositories/unit-of-work.interface';
import { ConcurrencyException } from '@infrastructure/exceptions/concurrency.exception';
import { cleanDatabase } from '../helpers/db-cleanup.helper';
import { createMockLogger } from '../helpers/logger-mock.factory';
import { createMockMetrics } from '../helpers/metrics-mock.factory';
import { TestContext, setupTestApp, teardownTestApp } from '../helpers/test-app.helper';

// Runs the use case against PostgreSQL through the app's unit of work; the relay is inert here, so
// the outbox rows stay in the table. The SQS path is covered by the stock messaging suite.
describe('Reserve stock (E2E)', () => {
  let ctx: TestContext;
  let useCase: ReserveStockUseCase;

  beforeAll(async () => {
    ctx = await setupTestApp();
    useCase = new ReserveStockUseCase(
      ctx.app.get<IUnitOfWork>('IUnitOfWork'),
      ctx.app.get<ICache>('ICache'),
      createMockLogger(),
      createMockMetrics(),
    );
  });

  afterAll(async () => {
    await teardownTestApp(ctx);
  });

  beforeEach(async () => {
    await cleanDatabase(ctx.prisma);
  });

  async function insertPart(stock: number, reservedStock = 0): Promise<string> {
    const id = randomUUID();

    await ctx.prisma.$executeRaw`
      INSERT INTO parts_supplies (id, name, sku, category, cost_price, sale_price, stock, reserved_stock, updated_at)
      VALUES (${id}::uuid, 'Oil filter', ${randomUUID().slice(0, 30)}, 'PART', 10, 20, ${stock}, ${reservedStock}, now())
    `;

    return id;
  }

  function part(id: string) {
    return ctx.prisma.partSupply.findUniqueOrThrow({ where: { id } });
  }

  it('reserves, raises reserved_stock and writes inventory.stock.reserved to the outbox', async () => {
    const first = await insertPart(10, 2);
    const second = await insertPart(3);
    const workOrderId = randomUUID();
    const quoteId = randomUUID();

    const result = await useCase.execute({
      workOrderId,
      quoteId,
      items: [
        { partSupplyId: first, quantity: 3 },
        { partSupplyId: second, quantity: 3 },
      ],
    });

    expect(result).toEqual({ outcome: 'reserved' });
    expect((await part(first)).reservedStock).toBe(5);
    expect((await part(second)).reservedStock).toBe(3);
    expect(
      await ctx.prisma.stockReservation.findMany({
        where: { workOrderId },
        select: { partSupplyId: true, quantity: true },
      }),
    ).toEqual(
      expect.arrayContaining([
        { partSupplyId: first, quantity: 3 },
        { partSupplyId: second, quantity: 3 },
      ]),
    );
    expect(await ctx.prisma.stockReservation.count()).toBe(2);
    expect(await ctx.prisma.outboxMessage.findMany()).toEqual([
      expect.objectContaining({
        type: 'inventory.stock.reserved',
        workOrderId,
        payload: { quoteId },
      }),
    ]);
  });

  it('writes only inventory.stock.reservation_failed when a part lacks stock', async () => {
    const enough = await insertPart(10);
    const short = await insertPart(2, 1);
    const workOrderId = randomUUID();
    const quoteId = randomUUID();

    const result = await useCase.execute({
      workOrderId,
      quoteId,
      items: [
        { partSupplyId: enough, quantity: 1 },
        { partSupplyId: short, quantity: 2 },
      ],
    });

    expect(result).toEqual({ outcome: 'insufficient' });
    expect((await part(enough)).reservedStock).toBe(0);
    expect((await part(short)).reservedStock).toBe(1);
    expect(await ctx.prisma.stockReservation.count()).toBe(0);
    expect(await ctx.prisma.outboxMessage.findMany()).toEqual([
      expect.objectContaining({
        type: 'inventory.stock.reservation_failed',
        workOrderId,
        payload: { quoteId, missing: [{ partSupplyId: short, requested: 2, available: 1 }] },
      }),
    ]);
  });

  it('republishes reserved without reserving again for a redelivered command', async () => {
    const id = await insertPart(5);
    const workOrderId = randomUUID();
    const command = {
      workOrderId,
      quoteId: randomUUID(),
      items: [{ partSupplyId: id, quantity: 2 }],
    };

    await useCase.execute(command);
    await useCase.execute(command);

    expect((await part(id)).reservedStock).toBe(2);
    expect(await ctx.prisma.stockReservation.count({ where: { workOrderId } })).toBe(1);
    expect((await ctx.prisma.outboxMessage.findMany()).map((message) => message.type)).toEqual([
      'inventory.stock.reserved',
      'inventory.stock.reserved',
    ]);
  });

  it('never reserves more than the stock when two work orders race for the last unit', async () => {
    const id = await insertPart(1);

    const results = await Promise.allSettled([
      useCase.execute({
        workOrderId: randomUUID(),
        quoteId: randomUUID(),
        items: [{ partSupplyId: id, quantity: 1 }],
      }),
      useCase.execute({
        workOrderId: randomUUID(),
        quoteId: randomUUID(),
        items: [{ partSupplyId: id, quantity: 1 }],
      }),
    ]);

    const reserved = results.filter(
      (result) => result.status === 'fulfilled' && result.value.outcome === 'reserved',
    );
    const lost = results.filter((result) => !reserved.includes(result));
    expect(reserved).toHaveLength(1);
    expect(lost).toHaveLength(1);
    expect(
      lost[0].status === 'rejected'
        ? lost[0].reason instanceof ConcurrencyException
        : lost[0].value.outcome === 'insufficient',
    ).toBe(true);

    const stored = await part(id);
    expect(stored.reservedStock).toBe(1);
    expect(stored.reservedStock).toBeLessThanOrEqual(stored.stock);
    expect(await ctx.prisma.stockReservation.count()).toBe(1);
  });
});
