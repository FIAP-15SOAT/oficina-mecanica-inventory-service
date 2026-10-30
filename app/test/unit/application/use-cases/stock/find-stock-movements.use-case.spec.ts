import { FindStockMovementsUseCase } from '@application/use-cases/stock/find-stock-movements.use-case';
import { StockMovementType } from '@domain/enums/stock-movement-type.enum';
import { IStockMovementRepository } from '@domain/interfaces/repositories/stock-movement.repository.interface';
import {
  createMockStockMovement,
  createMockStockMovementRepository,
} from '../../../../helpers/stock-movement-mock.factory';

describe('FindStockMovementsUseCase', () => {
  let useCase: FindStockMovementsUseCase;
  let repository: jest.Mocked<IStockMovementRepository>;

  beforeEach(() => {
    repository = createMockStockMovementRepository();
    useCase = new FindStockMovementsUseCase(repository);
  });

  it('should return paginated stock movements', async () => {
    const movement = createMockStockMovement();
    repository.findAllPaginated.mockResolvedValue({ items: [movement], total: 1 });

    const result = await useCase.execute({ page: 1, limit: 10 });

    expect(result.items).toEqual([movement]);
    expect(result.pagination).toEqual({ totalRecords: 1, totalPages: 1, page: 1, limit: 10 });
    expect(repository.findAllPaginated).toHaveBeenCalledWith(
      { page: 1, limit: 10 },
      { startDate: undefined, endDate: undefined },
    );
  });

  it('should return an empty result when there are no movements', async () => {
    repository.findAllPaginated.mockResolvedValue({ items: [], total: 0 });

    const result = await useCase.execute({ page: 1, limit: 10 });

    expect(result.items).toHaveLength(0);
    expect(result.pagination.totalRecords).toBe(0);
  });

  it('should calculate total pages for several pages', async () => {
    repository.findAllPaginated.mockResolvedValue({ items: [], total: 12 });

    const result = await useCase.execute({ page: 2, limit: 5 });

    expect(result.pagination).toEqual({ totalRecords: 12, totalPages: 3, page: 2, limit: 5 });
  });

  it('should turn startDate into start of day and endDate into end of day in UTC', async () => {
    repository.findAllPaginated.mockResolvedValue({ items: [], total: 0 });

    await useCase.execute({ page: 1, limit: 10, startDate: '2023-01-01', endDate: '2023-01-31' });

    expect(repository.findAllPaginated).toHaveBeenCalledWith(
      { page: 1, limit: 10 },
      {
        startDate: new Date('2023-01-01T00:00:00.000Z'),
        endDate: new Date('2023-01-31T23:59:59.999Z'),
      },
    );
  });

  it('should forward partSupplyId, workOrderId and type filters', async () => {
    repository.findAllPaginated.mockResolvedValue({ items: [], total: 0 });

    await useCase.execute({
      page: 1,
      limit: 10,
      partSupplyId: 'part-id',
      workOrderId: 'work-order-id',
      type: StockMovementType.EXIT,
    });

    expect(repository.findAllPaginated).toHaveBeenCalledWith(
      { page: 1, limit: 10 },
      expect.objectContaining({
        partSupplyId: 'part-id',
        workOrderId: 'work-order-id',
        type: StockMovementType.EXIT,
      }),
    );
  });
});
