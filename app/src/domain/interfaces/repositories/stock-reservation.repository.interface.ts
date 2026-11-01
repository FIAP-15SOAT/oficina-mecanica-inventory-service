import { StockReservation } from '../../entities/stock-reservation.entity';
import { PaginatedRepositoryResult, PaginationInput } from '../common/pagination.interface';

export interface StockReservationFilters {
  partSupplyId?: string;
  workOrderId?: string;
}

export interface IStockReservationRepository {
  createMany(reservations: StockReservation[]): Promise<void>;
  findByWorkOrderId(workOrderId: string): Promise<StockReservation[]>;
  findAllPaginated(
    pagination: PaginationInput,
    filters: StockReservationFilters,
  ): Promise<PaginatedRepositoryResult<StockReservation>>;
  deleteByWorkOrderId(workOrderId: string): Promise<void>;
}
