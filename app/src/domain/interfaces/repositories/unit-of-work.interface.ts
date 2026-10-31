import { IOutboxRepository } from './outbox.repository.interface';
import { IPartSupplyRepository } from './part-supply.repository.interface';
import { IServiceRepository } from './service.repository.interface';
import { IStockMovementRepository } from './stock-movement.repository.interface';
import { IStockReservationRepository } from './stock-reservation.repository.interface';

export interface IRepositories {
  outbox: IOutboxRepository;
  partSupply: IPartSupplyRepository;
  service: IServiceRepository;
  stockMovement: IStockMovementRepository;
  stockReservation: IStockReservationRepository;
}

export interface IUnitOfWork {
  executeTransaction<T>(work: (repositories: IRepositories) => Promise<T>): Promise<T>;
}
