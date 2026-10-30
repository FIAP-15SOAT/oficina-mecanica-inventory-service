import { randomUUID } from 'node:crypto';

import { ConsumeReservedStockUseCase } from '@application/use-cases/stock/consume-reserved-stock.use-case';
import { BUSINESS_EVENTS } from '@application/logging/business-event.catalog';
import { inventoryCacheKeys } from '@application/keys/inventory-cache-keys';
import { ICache } from '@application/ports/output/cache.service.interface';
import { ILogger } from '@application/ports/output/logger.service.interface';
import { PartSupply } from '@domain/entities/part-supply.entity';
import { StockMovement } from '@domain/entities/stock-movement.entity';
import { StockMovementType } from '@domain/enums/stock-movement-type.enum';
import { IUnitOfWork } from '@domain/interfaces/repositories/unit-of-work.interface';
import { ConcurrencyException } from '@infrastructure/exceptions/concurrency.exception';
import { createMockCache } from '../../../../helpers/cache-mock.factory';
import { createMockLogger } from '../../../../helpers/logger-mock.factory';
import { createMockPartSupply } from '../../../../helpers/part-supply-mock.factory';
import { createMockStockReservation } from '../../../../helpers/stock-reservation-mock.factory';
import {
  createMockUnitOfWorkWithRepos,
  MockedRepositories,
} from '../../../../helpers/unit-of-work-mock.factory';

describe('ConsumeReservedStockUseCase', () => {
  let useCase: ConsumeReservedStockUseCase;
  let unitOfWork: jest.Mocked<IUnitOfWork>;
  let repos: MockedRepositories;
  let cache: jest.Mocked<ICache>;
  let logger: jest.Mocked<ILogger>;

  const workOrderId = randomUUID();

  beforeEach(() => {
    const uow = createMockUnitOfWorkWithRepos();

    unitOfWork = uow.unitOfWork;
    repos = uow.repos;
    cache = createMockCache();
    logger = createMockLogger();
    useCase = new ConsumeReservedStockUseCase(unitOfWork, cache, logger);

    repos.stockReservation.findByWorkOrderId.mockResolvedValue([]);
    repos.stockReservation.deleteByWorkOrderId.mockResolvedValue(undefined);
    repos.stockMovement.createMany.mockResolvedValue(undefined);
    repos.partSupply.update.mockImplementation((partSupply) => Promise.resolve(partSupply));
  });

  function givenReservations(...entries: [PartSupply, number][]): void {
    repos.stockReservation.findByWorkOrderId.mockResolvedValue(
      entries.map(([part, quantity]) =>
        createMockStockReservation({ partSupplyId: part.id, workOrderId, quantity }),
      ),
    );
    repos.partSupply.findByIds.mockResolvedValue(entries.map(([part]) => part));
  }

  function movementsWritten(): StockMovement[] {
    return repos.stockMovement.createMany.mock.calls[0][0];
  }

  it('consumes every reservation of the work order', async () => {
    const filter = createMockPartSupply({ stock: 10, reservedStock: 5 });
    const pad = createMockPartSupply({ stock: 4, reservedStock: 4 });
    givenReservations([filter, 3], [pad, 4]);

    const result = await useCase.execute({ workOrderId });

    expect(result).toEqual({ consumedItemCount: 2 });
    expect(repos.partSupply.findByIds).toHaveBeenCalledWith([filter.id, pad.id]);
    expect(filter.stock).toBe(7);
    expect(filter.reservedStock).toBe(2);
    expect(pad.stock).toBe(0);
    expect(pad.reservedStock).toBe(0);
    expect(repos.partSupply.update).toHaveBeenCalledWith(filter);
    expect(repos.partSupply.update).toHaveBeenCalledWith(pad);
    expect(movementsWritten()).toEqual([
      expect.objectContaining({
        partSupplyId: filter.id,
        workOrderId,
        type: StockMovementType.EXIT,
        quantity: 3,
        reason: `Saída por Ordem de Serviço ${workOrderId}`,
      }),
      expect.objectContaining({
        partSupplyId: pad.id,
        workOrderId,
        type: StockMovementType.EXIT,
        quantity: 4,
        reason: `Saída por Ordem de Serviço ${workOrderId}`,
      }),
    ]);
    expect(repos.stockMovement.createMany).toHaveBeenCalledTimes(1);
    expect(repos.stockReservation.deleteByWorkOrderId).toHaveBeenCalledWith(workOrderId);
    expect(repos.outbox.add).not.toHaveBeenCalled();
  });

  it('does nothing when the work order has no reservations', async () => {
    const result = await useCase.execute({ workOrderId });

    expect(result).toEqual({ consumedItemCount: 0 });
    expect(repos.stockReservation.findByWorkOrderId).toHaveBeenCalledWith(workOrderId);
    expect(repos.partSupply.findByIds).not.toHaveBeenCalled();
    expect(repos.partSupply.update).not.toHaveBeenCalled();
    expect(repos.stockMovement.createMany).not.toHaveBeenCalled();
    expect(repos.stockReservation.deleteByWorkOrderId).not.toHaveBeenCalled();
    expect(repos.outbox.add).not.toHaveBeenCalled();
    expect(logger.event).not.toHaveBeenCalled();
    expect(cache.delete).not.toHaveBeenCalled();
  });

  it('is idempotent on a repeated command', async () => {
    const part = createMockPartSupply({ stock: 5, reservedStock: 2 });
    givenReservations([part, 2]);

    expect(await useCase.execute({ workOrderId })).toEqual({ consumedItemCount: 1 });

    repos.stockReservation.findByWorkOrderId.mockResolvedValue([]);

    expect(await useCase.execute({ workOrderId })).toEqual({ consumedItemCount: 0 });
    expect(part.stock).toBe(3);
    expect(part.reservedStock).toBe(0);
    expect(repos.partSupply.update).toHaveBeenCalledTimes(1);
    expect(repos.stockMovement.createMany).toHaveBeenCalledTimes(1);
    expect(logger.event).toHaveBeenCalledTimes(1);
  });

  it('sums reservations of the same part before consuming', async () => {
    const part = createMockPartSupply({ stock: 10, reservedStock: 5 });
    givenReservations([part, 2], [part, 3]);

    const result = await useCase.execute({ workOrderId });

    expect(result).toEqual({ consumedItemCount: 1 });
    expect(repos.partSupply.findByIds).toHaveBeenCalledWith([part.id]);
    expect(repos.partSupply.update).toHaveBeenCalledTimes(1);
    expect(part.stock).toBe(5);
    expect(part.reservedStock).toBe(0);
    expect(movementsWritten()).toEqual([
      expect.objectContaining({ partSupplyId: part.id, quantity: 5 }),
    ]);
  });

  it('propagates a version conflict and leaves reservations untouched', async () => {
    const part = createMockPartSupply({ stock: 5, reservedStock: 2 });
    givenReservations([part, 2]);
    repos.partSupply.update.mockRejectedValue(
      new ConcurrencyException('Peça/insumo foi modificado por outra operação. Tente novamente'),
    );

    await expect(useCase.execute({ workOrderId })).rejects.toBeInstanceOf(ConcurrencyException);

    expect(repos.stockMovement.createMany).not.toHaveBeenCalled();
    expect(repos.stockReservation.deleteByWorkOrderId).not.toHaveBeenCalled();
    expect(logger.event).not.toHaveBeenCalled();
    expect(cache.delete).not.toHaveBeenCalled();
  });

  it('logs and clears the cache only after the transaction commits', async () => {
    const first = createMockPartSupply({ stock: 10, reservedStock: 1 });
    const second = createMockPartSupply({ stock: 10, reservedStock: 2 });
    givenReservations([first, 1], [second, 2]);
    const order: string[] = [];
    unitOfWork.executeTransaction.mockImplementation(async (work) => {
      const result = await work(repos);
      order.push('commit');
      return result;
    });
    logger.event.mockImplementation(() => order.push('log'));
    cache.delete.mockImplementation(() => {
      order.push('cache');
      return Promise.resolve();
    });

    await useCase.execute({ workOrderId });

    expect(order).toEqual(['commit', 'log', 'cache']);
    expect(logger.event).toHaveBeenCalledWith(BUSINESS_EVENTS.STOCK_CONSUMED, {
      workOrderId,
      consumedItemCount: 2,
    });
    expect(cache.delete).toHaveBeenCalledWith([
      inventoryCacheKeys.partSupply(first.id),
      inventoryCacheKeys.partSupply(second.id),
    ]);
  });

  it('does not log or clear the cache when nothing was consumed', async () => {
    await useCase.execute({ workOrderId });

    expect(logger.event).not.toHaveBeenCalled();
    expect(cache.delete).not.toHaveBeenCalled();
  });

  it('does not log or clear the cache when the transaction fails', async () => {
    unitOfWork.executeTransaction.mockRejectedValue(new Error('connection lost'));

    await expect(useCase.execute({ workOrderId })).rejects.toThrow('connection lost');

    expect(logger.event).not.toHaveBeenCalled();
    expect(cache.delete).not.toHaveBeenCalled();
  });
});
