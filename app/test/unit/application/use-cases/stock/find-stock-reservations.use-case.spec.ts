import { FindStockReservationsUseCase } from '@application/use-cases/stock/find-stock-reservations.use-case';
import { IStockReservationRepository } from '@domain/interfaces/repositories/stock-reservation.repository.interface';
import {
  createMockStockReservation,
  createMockStockReservationRepository,
} from '../../../../helpers/stock-reservation-mock.factory';

describe('FindStockReservationsUseCase', () => {
  let useCase: FindStockReservationsUseCase;
  let repository: jest.Mocked<IStockReservationRepository>;

  beforeEach(() => {
    repository = createMockStockReservationRepository();
    useCase = new FindStockReservationsUseCase(repository);
  });

  it('should return paginated stock reservations', async () => {
    const reservation = createMockStockReservation();
    repository.findAllPaginated.mockResolvedValue({ items: [reservation], total: 1 });

    const result = await useCase.execute({ page: 1, limit: 10 });

    expect(result.items).toEqual([reservation]);
    expect(result.pagination).toEqual({ totalRecords: 1, totalPages: 1, page: 1, limit: 10 });
    expect(repository.findAllPaginated).toHaveBeenCalledWith({ page: 1, limit: 10 }, {});
  });

  it('should return an empty result when there are no reservations', async () => {
    repository.findAllPaginated.mockResolvedValue({ items: [], total: 0 });

    const result = await useCase.execute({ page: 1, limit: 10 });

    expect(result.items).toHaveLength(0);
    expect(result.pagination.totalRecords).toBe(0);
  });

  it('should calculate total pages', async () => {
    repository.findAllPaginated.mockResolvedValue({ items: [], total: 10 });

    const result = await useCase.execute({ page: 3, limit: 4 });

    expect(result.pagination.totalPages).toBe(3);
  });

  it('should forward partSupplyId and workOrderId filters', async () => {
    repository.findAllPaginated.mockResolvedValue({ items: [], total: 0 });

    await useCase.execute({ page: 1, limit: 10, partSupplyId: 'part-id', workOrderId: 'wo-id' });

    expect(repository.findAllPaginated).toHaveBeenCalledWith(
      { page: 1, limit: 10 },
      { partSupplyId: 'part-id', workOrderId: 'wo-id' },
    );
  });
});
