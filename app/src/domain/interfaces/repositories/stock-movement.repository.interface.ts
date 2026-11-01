import { StockMovement } from '../../entities/stock-movement.entity';
import { StockMovementType } from '../../enums/stock-movement-type.enum';
import { PaginatedRepositoryResult, PaginationInput } from '../common/pagination.interface';

export interface StockMovementFilters {
  partSupplyId?: string;
  workOrderId?: string;
  type?: StockMovementType;
  startDate?: Date;
  endDate?: Date;
}

export interface IStockMovementRepository {
  create(movement: StockMovement): Promise<StockMovement>;
  createMany(movements: StockMovement[]): Promise<void>;
  findAllPaginated(
    pagination: PaginationInput,
    filters: StockMovementFilters,
  ): Promise<PaginatedRepositoryResult<StockMovement>>;
}
