import { StockMovementType } from '@domain/enums/stock-movement-type.enum';
import { PaginationInput } from '@domain/interfaces/common/pagination.interface';

export interface FindStockMovementsInputDto extends PaginationInput {
  partSupplyId?: string;
  workOrderId?: string;
  type?: StockMovementType;
  startDate?: string;
  endDate?: string;
}
