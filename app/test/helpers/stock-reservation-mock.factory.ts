import { randomUUID } from 'node:crypto';
import { StockReservation } from '@domain/entities/stock-reservation.entity';
import { IStockReservationRepository } from '@domain/interfaces/repositories/stock-reservation.repository.interface';

export function createMockStockReservation(
  overrides: Partial<StockReservation> = {},
): StockReservation {
  const now = new Date();

  return StockReservation.reconstitute({
    id: randomUUID(),
    partSupplyId: randomUUID(),
    workOrderId: randomUUID(),
    quantity: 1,
    createdAt: now,
    ...overrides,
  });
}

export function createMockStockReservationRepository(): jest.Mocked<IStockReservationRepository> {
  return {
    createMany: jest.fn(),
    findByWorkOrderId: jest.fn(),
    findAllPaginated: jest.fn(),
    deleteByWorkOrderId: jest.fn(),
  };
}
