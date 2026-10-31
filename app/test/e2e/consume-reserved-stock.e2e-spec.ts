import { randomUUID } from 'node:crypto';

import { ConsumeReservedStockUseCase } from '@application/use-cases/stock/consume-reserved-stock.use-case';
import { ICache } from '@application/ports/output/cache.service.interface';
import { IUnitOfWork } from '@domain/interfaces/repositories/unit-of-work.interface';
import { ConcurrencyException } from '@infrastructure/exceptions/concurrency.exception';
import { cleanDatabase } from '../helpers/db-cleanup.helper';
import { createMockLogger } from '../helpers/logger-mock.factory';
import { TestContext, setupTestApp, teardownTestApp } from '../helpers/test-app.helper';

// Runs the use case against PostgreSQL through the app's unit of work. The SQS path is covered by
// the stock messaging suite.
describe('Consume reserved stock (E2E)', () => {
  let ctx: TestContext;
  let unitOfWork: IUnitOfWork;
  let useCase: ConsumeReservedStockUseCase;

  beforeAll(async () => {
    ctx = await setupTestApp();
    unitOfWork = ctx.app.get<IUnitOfWork>('IUnitOfWork');
    useCase = new ConsumeReservedStockUseCase(
      unitOfWork,
      ctx.app.get<ICache>('ICache'),
      createMockLogger(),
    );
  });

  afterAll(async () => {
    await teardownTestApp(ctx);
  });

  beforeEach(async () => {
    await cleanDatabase(ctx.prisma);
  });

  async function insertPart(stock: number, reservedStock: number): Promise<string> {
    const id = randomUUID();

    await ctx.prisma.$executeRaw`
      INSERT INTO parts_supplies (id, name, sku, category, cost_price, sale_price, stock, reserved_stock, updated_at)
      VALUES (${id}::uuid, 'Oil filter', ${randomUUID().slice(0, 30)}, 'PART', 10, 20, ${stock}, ${reservedStock}, now())
    `;

    return id;
  }

  async function reserve(workOrderId: string, partSupplyId: string, quantity: number) {
    await ctx.prisma.stockReservation.create({ data: { workOrderId, partSupplyId, quantity } });
  }

  function part(id: string) {
    return ctx.prisma.partSupply.findUniqueOrThrow({ where: { id } });
  }

  it('consumes both parts, writes one EXIT each, deletes the reservations and no outbox row', async () => {
    const first = await insertPart(10, 5);
    const second = await insertPart(4, 4);
    const workOrderId = randomUUID();
    await reserve(workOrderId, first, 3);
    await reserve(workOrderId, second, 4);

    const result = await useCase.execute({ workOrderId });

    expect(result).toEqual({ consumedItemCount: 2 });
    expect(await part(first)).toEqual(expect.objectContaining({ stock: 7, reservedStock: 2 }));
    expect(await part(second)).toEqual(expect.objectContaining({ stock: 0, reservedStock: 0 }));
    expect(
      await ctx.prisma.stockMovement.findMany({
        select: { partSupplyId: true, type: true, quantity: true, workOrderId: true, reason: true },
      }),
    ).toEqual(
      expect.arrayContaining([
        {
          partSupplyId: first,
          type: 'EXIT',
          quantity: 3,
          workOrderId,
          reason: `Saída por Ordem de Serviço ${workOrderId}`,
        },
        {
          partSupplyId: second,
          type: 'EXIT',
          quantity: 4,
          workOrderId,
          reason: `Saída por Ordem de Serviço ${workOrderId}`,
        },
      ]),
    );
    expect(await ctx.prisma.stockMovement.count()).toBe(2);
    expect(await ctx.prisma.stockReservation.count({ where: { workOrderId } })).toBe(0);
    expect(await ctx.prisma.outboxMessage.count()).toBe(0);
  });

  it('has no effect and no error on a repeated command', async () => {
    const id = await insertPart(5, 2);
    const workOrderId = randomUUID();
    await reserve(workOrderId, id, 2);

    await useCase.execute({ workOrderId });
    const repeated = await useCase.execute({ workOrderId });

    expect(repeated).toEqual({ consumedItemCount: 0 });
    expect(await part(id)).toEqual(expect.objectContaining({ stock: 3, reservedStock: 0 }));
    expect(await ctx.prisma.stockMovement.count()).toBe(1);
  });

  it('has no effect for a work order without reservations', async () => {
    const id = await insertPart(5, 2);

    const result = await useCase.execute({ workOrderId: randomUUID() });

    expect(result).toEqual({ consumedItemCount: 0 });
    expect(await part(id)).toEqual(expect.objectContaining({ stock: 5, reservedStock: 2 }));
    expect(await ctx.prisma.stockMovement.count()).toBe(0);
  });

  it('sums two reservations of the same part in one update and one movement', async () => {
    const id = await insertPart(10, 5);
    const workOrderId = randomUUID();
    await reserve(workOrderId, id, 2);
    await reserve(workOrderId, id, 3);

    const result = await useCase.execute({ workOrderId });

    expect(result).toEqual({ consumedItemCount: 1 });
    expect(await part(id)).toEqual(
      expect.objectContaining({ stock: 5, reservedStock: 0, version: 2 }),
    );
    expect(await ctx.prisma.stockMovement.findMany()).toEqual([
      expect.objectContaining({ partSupplyId: id, quantity: 5, type: 'EXIT' }),
    ]);
  });

  it('rolls everything back when the part version changes between read and write', async () => {
    const id = await insertPart(5, 2);
    const workOrderId = randomUUID();
    await reserve(workOrderId, id, 2);
    // A concurrent writer commits right after the transaction reads the part.
    const racing = new ConsumeReservedStockUseCase(
      {
        executeTransaction: (work) =>
          unitOfWork.executeTransaction((repos) =>
            work({
              ...repos,
              partSupply: {
                ...repos.partSupply,
                findByIds: async (ids) => {
                  const found = await repos.partSupply.findByIds(ids);
                  await ctx.prisma
                    .$executeRaw`UPDATE parts_supplies SET version = version + 1 WHERE id = ${id}::uuid`;
                  return found;
                },
                update: (entity) => repos.partSupply.update(entity),
              },
            }),
          ),
      },
      ctx.app.get<ICache>('ICache'),
      createMockLogger(),
    );

    await expect(racing.execute({ workOrderId })).rejects.toBeInstanceOf(ConcurrencyException);

    expect(await part(id)).toEqual(expect.objectContaining({ stock: 5, reservedStock: 2 }));
    expect(await ctx.prisma.stockReservation.count({ where: { workOrderId } })).toBe(1);
    expect(await ctx.prisma.stockMovement.count()).toBe(0);
  });

  it('keeps reserved_stock non-negative and stock >= reserved_stock', async () => {
    const id = await insertPart(5, 1);
    const workOrderId = randomUUID();
    await reserve(workOrderId, id, 3);

    await expect(useCase.execute({ workOrderId })).rejects.toThrow(/Reserva insuficiente/);

    const stored = await part(id);
    expect(stored.reservedStock).toBeGreaterThanOrEqual(0);
    expect(stored.stock).toBeGreaterThanOrEqual(stored.reservedStock);
    expect(await ctx.prisma.stockReservation.count({ where: { workOrderId } })).toBe(1);
    expect(await ctx.prisma.stockMovement.count()).toBe(0);
  });
});
