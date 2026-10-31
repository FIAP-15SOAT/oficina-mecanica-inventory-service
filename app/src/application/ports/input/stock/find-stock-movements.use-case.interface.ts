import { StockMovement } from '@domain/entities/stock-movement.entity';
import { PaginatedResult } from '@domain/interfaces/common/pagination.interface';
import { FindStockMovementsInputDto } from './dto/find-stock-movements.dto';

export interface IFindStockMovementsUseCase {
  execute(input: FindStockMovementsInputDto): Promise<PaginatedResult<StockMovement>>;
}
