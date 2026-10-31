import { randomUUID } from 'node:crypto';

import { ReserveStockUseCase } from '@application/use-cases/stock/reserve-stock.use-case';
import { BUSINESS_EVENTS } from '@application/logging/business-event.catalog';
import { BUSINESS_METRICS } from '@application/metrics/business-metric.catalog';
import { inventoryCacheKeys } from '@application/keys/inventory-cache-keys';
import { ICache } from '@application/ports/output/cache.service.interface';
import { ILogger } from '@application/ports/output/logger.service.interface';
import { IMetrics } from '@application/ports/output/metrics.service.interface';
import { PartSupply } from '@domain/entities/part-supply.entity';
import { StockReservation } from '@domain/entities/stock-reservation.entity';
import { IUnitOfWork } from '@domain/interfaces/repositories/unit-of-work.interface';
import { ConcurrencyException } from '@infrastructure/exceptions/concurrency.exception';
import { createMockCache } from '../../../../helpers/cache-mock.factory';
import { createMockLogger } from '../../../../helpers/logger-mock.factory';
import { createMockMetrics } from '../../../../helpers/metrics-mock.factory';
import { createMockPartSupply } from '../../../../helpers/part-supply-mock.factory';
import { createMockStockReservation } from '../../../../helpers/stock-reservation-mock.factory';
import {
  createMockUnitOfWorkWithRepos,
  MockedRepositories,
} from '../../../../helpers/unit-of-work-mock.factory';

describe('ReserveStockUseCase', () => {
  let useCase: ReserveStockUseCase;
  let unitOfWork: jest.Mocked<IUnitOfWork>;
  let repos: MockedRepositories;
  let cache: jest.Mocked<ICache>;
  let logger: jest.Mocked<ILogger>;
  let metrics: jest.Mocked<IMetrics>;

  const workOrderId = randomUUID();
  const quoteId = randomUUID();

  beforeEach(() => {
    const uow = createMockUnitOfWorkWithRepos();

    unitOfWork = uow.unitOfWork;
    repos = uow.repos;
    cache = createMockCache();
    logger = createMockLogger();
    metrics = createMockMetrics();
    useCase = new ReserveStockUseCase(unitOfWork, cache, logger, metrics);

    repos.stockReservation.findByWorkOrderId.mockResolvedValue([]);
    repos.stockReservation.createMany.mockResolvedValue(undefined);
    repos.partSupply.update.mockImplementation((partSupply) => Promise.resolve(partSupply));
  });

  function givenParts(...parts: PartSupply[]): void {
    repos.partSupply.findByIds.mockResolvedValue(parts);
  }

  function reservationsWritten(): StockReservation[] {
    return repos.stockReservation.createMany.mock.calls[0][0];
  }

  it('reserves every item when stock is enough', async () => {
    const filter = createMockPartSupply({ stock: 10, reservedStock: 2 });
    const pad = createMockPartSupply({ stock: 4, reservedStock: 0 });
    givenParts(filter, pad);

    const result = await useCase.execute({
      workOrderId,
      quoteId,
      items: [
        { partSupplyId: filter.id, quantity: 3 },
        { partSupplyId: pad.id, quantity: 4 },
      ],
    });

    expect(result).toEqual({ outcome: 'reserved' });
    expect(repos.partSupply.findByIds).toHaveBeenCalledWith([filter.id, pad.id]);
    expect(filter.reservedStock).toBe(5);
    expect(pad.reservedStock).toBe(4);
    expect(repos.partSupply.update).toHaveBeenCalledWith(filter);
    expect(repos.partSupply.update).toHaveBeenCalledWith(pad);
    expect(reservationsWritten()).toEqual([
      expect.objectContaining({ partSupplyId: filter.id, workOrderId, quantity: 3 }),
      expect.objectContaining({ partSupplyId: pad.id, workOrderId, quantity: 4 }),
    ]);
    expect(repos.outbox.add).toHaveBeenCalledTimes(1);
    expect(repos.outbox.add).toHaveBeenCalledWith({
      type: 'inventory.stock.reserved',
      workOrderId,
      payload: { quoteId },
    });
  });

  it('reserves nothing and reports every missing item when one lacks stock', async () => {
    const enough = createMockPartSupply({ stock: 10, reservedStock: 0 });
    const short = createMockPartSupply({ stock: 5, reservedStock: 4 });
    const empty = createMockPartSupply({ stock: 0, reservedStock: 0 });
    givenParts(enough, short, empty);

    const result = await useCase.execute({
      workOrderId,
      quoteId,
      items: [
        { partSupplyId: short.id, quantity: 2 },
        { partSupplyId: enough.id, quantity: 1 },
        { partSupplyId: empty.id, quantity: 3 },
      ],
    });

    expect(result).toEqual({ outcome: 'insufficient' });
    expect(repos.partSupply.update).not.toHaveBeenCalled();
    expect(repos.stockReservation.createMany).not.toHaveBeenCalled();
    expect(enough.reservedStock).toBe(0);
    expect(repos.outbox.add).toHaveBeenCalledTimes(1);
    expect(repos.outbox.add).toHaveBeenCalledWith({
      type: 'inventory.stock.reservation_failed',
      workOrderId,
      payload: {
        quoteId,
        missing: [
          { partSupplyId: short.id, requested: 2, available: 1 },
          { partSupplyId: empty.id, requested: 3, available: 0 },
        ],
      },
    });
    expect(metrics.increment).toHaveBeenCalledWith(BUSINESS_METRICS.STOCK_RESERVATION, {
      outcome: 'insufficient',
    });
    expect(logger.event).toHaveBeenCalledWith(BUSINESS_EVENTS.STOCK_RESERVATION_FAILED, {
      workOrderId,
      quoteId,
      missingItemCount: 2,
    });
  });

  it('republishes reserved when the work order already has reservations', async () => {
    repos.stockReservation.findByWorkOrderId.mockResolvedValue([
      createMockStockReservation({ workOrderId }),
    ]);

    const result = await useCase.execute({
      workOrderId,
      quoteId,
      items: [{ partSupplyId: randomUUID(), quantity: 1 }],
    });

    expect(result).toEqual({ outcome: 'reserved' });
    expect(repos.stockReservation.findByWorkOrderId).toHaveBeenCalledWith(workOrderId);
    expect(repos.partSupply.findByIds).not.toHaveBeenCalled();
    expect(repos.partSupply.update).not.toHaveBeenCalled();
    expect(repos.stockReservation.createMany).not.toHaveBeenCalled();
    expect(repos.outbox.add).toHaveBeenCalledTimes(1);
    expect(repos.outbox.add).toHaveBeenCalledWith({
      type: 'inventory.stock.reserved',
      workOrderId,
      payload: { quoteId },
    });
    expect(metrics.increment).not.toHaveBeenCalled();
    expect(logger.event).not.toHaveBeenCalled();
    expect(cache.delete).not.toHaveBeenCalled();
  });

  it('sums repeated partSupplyId before reserving', async () => {
    const part = createMockPartSupply({ stock: 5, reservedStock: 0 });
    givenParts(part);

    await useCase.execute({
      workOrderId,
      quoteId,
      items: [
        { partSupplyId: part.id, quantity: 2 },
        { partSupplyId: part.id, quantity: 3 },
      ],
    });

    expect(repos.partSupply.findByIds).toHaveBeenCalledWith([part.id]);
    expect(repos.partSupply.update).toHaveBeenCalledTimes(1);
    expect(part.reservedStock).toBe(5);
    expect(reservationsWritten()).toEqual([
      expect.objectContaining({ partSupplyId: part.id, quantity: 5 }),
    ]);
  });

  it('reports the summed quantity when repeated items exceed the available stock', async () => {
    const part = createMockPartSupply({ stock: 4, reservedStock: 0 });
    givenParts(part);

    const result = await useCase.execute({
      workOrderId,
      quoteId,
      items: [
        { partSupplyId: part.id, quantity: 2 },
        { partSupplyId: part.id, quantity: 3 },
      ],
    });

    expect(result).toEqual({ outcome: 'insufficient' });
    expect(repos.outbox.add).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: { quoteId, missing: [{ partSupplyId: part.id, requested: 5, available: 4 }] },
      }),
    );
  });

  it('treats an unknown part as missing with available 0', async () => {
    const known = createMockPartSupply({ stock: 10, reservedStock: 0 });
    const unknownId = randomUUID();
    givenParts(known);

    const result = await useCase.execute({
      workOrderId,
      quoteId,
      items: [
        { partSupplyId: known.id, quantity: 1 },
        { partSupplyId: unknownId, quantity: 2 },
      ],
    });

    expect(result).toEqual({ outcome: 'insufficient' });
    expect(repos.partSupply.update).not.toHaveBeenCalled();
    expect(repos.outbox.add).toHaveBeenCalledWith({
      type: 'inventory.stock.reservation_failed',
      workOrderId,
      payload: { quoteId, missing: [{ partSupplyId: unknownId, requested: 2, available: 0 }] },
    });
  });

  it('lets a version conflict propagate and writes nothing after commit', async () => {
    const part = createMockPartSupply({ stock: 5, reservedStock: 0 });
    givenParts(part);
    repos.partSupply.update.mockRejectedValue(
      new ConcurrencyException('Peça/insumo foi modificado por outra operação. Tente novamente'),
    );

    await expect(
      useCase.execute({ workOrderId, quoteId, items: [{ partSupplyId: part.id, quantity: 1 }] }),
    ).rejects.toBeInstanceOf(ConcurrencyException);

    expect(repos.stockReservation.createMany).not.toHaveBeenCalled();
    expect(repos.outbox.add).not.toHaveBeenCalled();
    expect(metrics.increment).not.toHaveBeenCalled();
    expect(logger.event).not.toHaveBeenCalled();
    expect(cache.delete).not.toHaveBeenCalled();
  });

  it('records the metric, logs and clears the cache only after the transaction commits', async () => {
    const first = createMockPartSupply({ stock: 10, reservedStock: 0 });
    const second = createMockPartSupply({ stock: 10, reservedStock: 0 });
    givenParts(first, second);
    const order: string[] = [];
    unitOfWork.executeTransaction.mockImplementation(async (work) => {
      const result = await work(repos);
      order.push('commit');
      return result;
    });
    metrics.increment.mockImplementation(() => order.push('metric'));
    logger.event.mockImplementation(() => order.push('log'));
    cache.delete.mockImplementation(() => {
      order.push('cache');
      return Promise.resolve();
    });

    await useCase.execute({
      workOrderId,
      quoteId,
      items: [
        { partSupplyId: first.id, quantity: 1 },
        { partSupplyId: second.id, quantity: 2 },
      ],
    });

    expect(order).toEqual(['commit', 'metric', 'log', 'cache']);
    expect(metrics.increment).toHaveBeenCalledWith(BUSINESS_METRICS.STOCK_RESERVATION, {
      outcome: 'reserved',
    });
    expect(logger.event).toHaveBeenCalledWith(BUSINESS_EVENTS.STOCK_RESERVED, {
      workOrderId,
      quoteId,
      reservedItemCount: 2,
      reservedQuantity: 3,
    });
    expect(cache.delete).toHaveBeenCalledWith([
      inventoryCacheKeys.partSupply(first.id),
      inventoryCacheKeys.partSupply(second.id),
    ]);
  });

  it('does not clear the cache when stock was insufficient', async () => {
    const part = createMockPartSupply({ stock: 1, reservedStock: 1 });
    givenParts(part);

    await useCase.execute({
      workOrderId,
      quoteId,
      items: [{ partSupplyId: part.id, quantity: 1 }],
    });

    expect(cache.delete).not.toHaveBeenCalled();
  });

  it('does not touch cache, metric or log when the transaction fails', async () => {
    unitOfWork.executeTransaction.mockRejectedValue(new Error('connection lost'));

    await expect(
      useCase.execute({
        workOrderId,
        quoteId,
        items: [{ partSupplyId: randomUUID(), quantity: 1 }],
      }),
    ).rejects.toThrow('connection lost');

    expect(metrics.increment).not.toHaveBeenCalled();
    expect(logger.event).not.toHaveBeenCalled();
    expect(cache.delete).not.toHaveBeenCalled();
  });
});
