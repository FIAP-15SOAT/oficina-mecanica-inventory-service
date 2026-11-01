import { IRepositories, IUnitOfWork } from '@domain/interfaces/repositories/unit-of-work.interface';
import { createMockOutboxRepository } from './outbox-mock.factory';
import { createMockPartSupplyRepository } from './part-supply-mock.factory';
import { createMockServiceRepository } from './service-mock.factory';
import { createMockStockMovementRepository } from './stock-movement-mock.factory';
import { createMockStockReservationRepository } from './stock-reservation-mock.factory';

export type MockedRepositories = { [K in keyof IRepositories]: jest.Mocked<IRepositories[K]> };

export function createMockRepositories(): MockedRepositories {
  return {
    outbox: createMockOutboxRepository(),
    partSupply: createMockPartSupplyRepository(),
    service: createMockServiceRepository(),
    stockMovement: createMockStockMovementRepository(),
    stockReservation: createMockStockReservationRepository(),
  };
}

export function createMockUnitOfWorkWithRepos(): {
  unitOfWork: jest.Mocked<IUnitOfWork>;
  repos: MockedRepositories;
} {
  const repos = createMockRepositories();
  const unitOfWork: jest.Mocked<IUnitOfWork> = {
    executeTransaction: jest
      .fn()
      .mockImplementation((work: (repositories: IRepositories) => Promise<unknown>) => work(repos)),
  };

  return { unitOfWork, repos };
}
