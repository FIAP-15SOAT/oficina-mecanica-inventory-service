import { randomUUID } from 'node:crypto';

import { PartSupply } from '@domain/entities/part-supply.entity';
import { PartSupplyCategory } from '@domain/enums/part-supply-category.enum';
import { Unit } from '@domain/enums/unit.enum';
import { IPartSupplyRepository } from '@domain/interfaces/repositories/part-supply.repository.interface';
import { ConcurrencyException } from '@infrastructure/exceptions/concurrency.exception';
import { TestContext, setupTestApp, teardownTestApp } from '../helpers/test-app.helper';

describe('Catalog and stock persistence (E2E)', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await setupTestApp();
  });

  afterAll(async () => {
    await teardownTestApp(ctx);
  });

  function insertPartSupply(stock: number, reservedStock: number): Promise<number> {
    return ctx.prisma.$executeRaw`
      INSERT INTO parts_supplies (id, name, sku, category, cost_price, sale_price, stock, reserved_stock, updated_at)
      VALUES (${randomUUID()}::uuid, 'Oil filter', ${randomUUID().slice(0, 30)}, 'PART', 10, 20, ${stock}, ${reservedStock}, now())
    `;
  }

  describe('parts_supplies stock check', () => {
    it('rejects a reserved stock above the stock', async () => {
      await expect(insertPartSupply(1, 2)).rejects.toThrow(/parts_supplies_stock_check/);
    });

    it('rejects a negative reserved stock', async () => {
      await expect(insertPartSupply(5, -1)).rejects.toThrow(/parts_supplies_stock_check/);
    });

    it('accepts a reserved stock equal to the stock', async () => {
      await expect(insertPartSupply(2, 2)).resolves.toBe(1);
    });
  });

  describe('optimistic locking on parts_supplies', () => {
    it('lets only one of two updates with the same version write', async () => {
      const repository = ctx.app.get<IPartSupplyRepository>('IPartSupplyRepository');
      const created = await repository.create(
        PartSupply.create({
          name: 'Brake pad',
          sku: `BP-${randomUUID().slice(0, 8)}`,
          category: PartSupplyCategory.PART,
          unit: Unit.UN,
          costPrice: 30,
          salePrice: 60,
          stock: 5,
        }),
      );

      const first = (await repository.findById(created.id)) as PartSupply;
      const second = (await repository.findById(created.id)) as PartSupply;
      first.minStock = 3;
      second.minStock = 4;

      const results = await Promise.allSettled([
        repository.update(first),
        repository.update(second),
      ]);

      expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
      const rejected = results.find((r) => r.status === 'rejected') as PromiseRejectedResult;
      expect(rejected.reason).toBeInstanceOf(ConcurrencyException);

      const stored = (await repository.findById(created.id)) as PartSupply;
      const winner = results.find(
        (r) => r.status === 'fulfilled',
      ) as PromiseFulfilledResult<PartSupply>;
      expect(stored.version).toBe(2);
      expect(stored.minStock).toBe(winner.value.minStock);
      expect([3, 4]).toContain(stored.minStock);
    });
  });
});
