import { randomUUID } from 'node:crypto';

import { UpdateStockUseCase } from '@application/use-cases/part-supply/update-stock.use-case';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';
import { BUSINESS_EVENTS } from '@application/logging/business-event.catalog';
import { inventoryCacheKeys } from '@application/keys/inventory-cache-keys';
import { ICache } from '@application/ports/output/cache.service.interface';
import { ILogger } from '@application/ports/output/logger.service.interface';
import { StockMovementType } from '@domain/enums/stock-movement-type.enum';
import { BusinessRuleViolationException } from '@domain/exceptions/business-rule-violation.exception';
import { IUnitOfWork } from '@domain/interfaces/repositories/unit-of-work.interface';
import { createMockCache } from '../../../../helpers/cache-mock.factory';
import { createMockLogger } from '../../../../helpers/logger-mock.factory';
import { createMockPartSupply } from '../../../../helpers/part-supply-mock.factory';
import { createMockStockMovement } from '../../../../helpers/stock-movement-mock.factory';
import {
  createMockUnitOfWorkWithRepos,
  MockedRepositories,
} from '../../../../helpers/unit-of-work-mock.factory';

describe('UpdateStockUseCase', () => {
  let useCase: UpdateStockUseCase;
  let logger: jest.Mocked<ILogger>;
  let cache: jest.Mocked<ICache>;
  let unitOfWork: jest.Mocked<IUnitOfWork>;
  let repos: MockedRepositories;

  beforeEach(() => {
    const uow = createMockUnitOfWorkWithRepos();

    unitOfWork = uow.unitOfWork;
    repos = uow.repos;
    logger = createMockLogger();
    cache = createMockCache();
    useCase = new UpdateStockUseCase(unitOfWork, cache, logger);
  });

  function givenPartSupply(stock: number, reservedStock = 0) {
    const partSupply = createMockPartSupply({ id: randomUUID(), stock, reservedStock });

    repos.partSupply.findById.mockResolvedValue(partSupply);
    repos.partSupply.update.mockResolvedValue(partSupply);
    repos.stockMovement.create.mockResolvedValue(createMockStockMovement());

    return partSupply;
  }

  it('should register a stock entry (ENTRY)', async () => {
    const partSupply = givenPartSupply(10);

    const result = await useCase.execute({
      partSupplyId: partSupply.id,
      type: StockMovementType.ENTRY,
      quantity: 5,
      reason: 'Stock replenishment',
    });

    expect(result.stock).toBe(15);
    expect(repos.partSupply.update).toHaveBeenCalledWith(partSupply);
    expect(repos.stockMovement.create).toHaveBeenCalledWith(
      expect.objectContaining({
        partSupplyId: partSupply.id,
        type: StockMovementType.ENTRY,
        quantity: 5,
        reason: 'Stock replenishment',
        workOrderId: null,
      }),
    );
  });

  it('should register a stock exit linked to a work order (EXIT) with workOrderId', async () => {
    const workOrderId = randomUUID();
    const partSupply = givenPartSupply(10);

    const result = await useCase.execute({
      partSupplyId: partSupply.id,
      type: StockMovementType.EXIT,
      quantity: 3,
      reason: 'Work order consumption',
      workOrderId,
    });

    expect(result.stock).toBe(7);
    expect(repos.stockMovement.create).toHaveBeenCalledWith(
      expect.objectContaining({ workOrderId, type: StockMovementType.EXIT }),
    );
  });

  it('should register a stock adjustment (ADJUSTMENT) without a work order', async () => {
    const partSupply = givenPartSupply(10);

    const result = await useCase.execute({
      partSupplyId: partSupply.id,
      type: StockMovementType.ADJUSTMENT,
      quantity: 8,
      reason: 'Physical inventory adjustment',
    });

    expect(result.stock).toBe(8);
    expect(repos.stockMovement.create).toHaveBeenCalledTimes(1);
  });

  it('should create the movement with null reason when reason is not provided', async () => {
    const partSupply = givenPartSupply(10);

    await useCase.execute({
      partSupplyId: partSupply.id,
      type: StockMovementType.ENTRY,
      quantity: 1,
    });

    expect(repos.stockMovement.create.mock.calls[0][0].reason).toBeNull();
  });

  it('should log the event and invalidate the cache after the transaction commits', async () => {
    const workOrderId = randomUUID();
    const partSupply = givenPartSupply(10);

    await useCase.execute({
      partSupplyId: partSupply.id,
      type: StockMovementType.EXIT,
      quantity: 4,
      workOrderId,
    });

    expect(logger.event).toHaveBeenCalledWith(BUSINESS_EVENTS.STOCK_UPDATED, {
      partSupplyId: partSupply.id,
      partSupplyName: partSupply.name,
      movementType: StockMovementType.EXIT,
      movementQuantity: 4,
      currentQuantity: 6,
      workOrderId,
    });
    expect(cache.delete).toHaveBeenCalledWith([inventoryCacheKeys.partSupply(partSupply.id)]);

    const transactionOrder = unitOfWork.executeTransaction.mock.invocationCallOrder[0];

    expect(cache.delete.mock.invocationCallOrder[0]).toBeGreaterThan(transactionOrder);
    expect(logger.event.mock.invocationCallOrder[0]).toBeGreaterThan(transactionOrder);
  });

  it('should log without workOrderId when the movement has none', async () => {
    const partSupply = givenPartSupply(10);

    await useCase.execute({
      partSupplyId: partSupply.id,
      type: StockMovementType.ENTRY,
      quantity: 1,
    });

    expect(logger.event).toHaveBeenCalledWith(
      BUSINESS_EVENTS.STOCK_UPDATED,
      expect.objectContaining({ workOrderId: undefined }),
    );
  });

  it('should throw BusinessRuleViolationException when exit exceeds available stock', async () => {
    const partSupply = givenPartSupply(10);

    await expect(
      useCase.execute({
        partSupplyId: partSupply.id,
        type: StockMovementType.EXIT,
        quantity: 15,
        workOrderId: randomUUID(),
      }),
    ).rejects.toThrow(BusinessRuleViolationException);

    expect(repos.partSupply.update).not.toHaveBeenCalled();
    expect(repos.stockMovement.create).not.toHaveBeenCalled();
    expect(logger.event).not.toHaveBeenCalled();
    expect(cache.delete).not.toHaveBeenCalled();
  });

  it('should throw BusinessRuleViolationException when exit would leave stock below the reserved one', async () => {
    const partSupply = givenPartSupply(10, 8);

    await expect(
      useCase.execute({ partSupplyId: partSupply.id, type: StockMovementType.EXIT, quantity: 5 }),
    ).rejects.toThrow(BusinessRuleViolationException);

    expect(cache.delete).not.toHaveBeenCalled();
  });

  it('should neither log nor invalidate the cache when persisting the movement fails', async () => {
    const partSupply = givenPartSupply(10);

    repos.stockMovement.create.mockRejectedValue(new Error('db down'));

    await expect(
      useCase.execute({ partSupplyId: partSupply.id, type: StockMovementType.ENTRY, quantity: 1 }),
    ).rejects.toThrow('db down');

    expect(logger.event).not.toHaveBeenCalled();
    expect(cache.delete).not.toHaveBeenCalled();
  });

  it('should throw ResourceNotFoundException when the part or supply does not exist', async () => {
    repos.partSupply.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({
        partSupplyId: randomUUID(),
        type: StockMovementType.ENTRY,
        quantity: 1,
      }),
    ).rejects.toThrow(ResourceNotFoundException);

    expect(logger.event).not.toHaveBeenCalled();
    expect(cache.delete).not.toHaveBeenCalled();
  });
});
