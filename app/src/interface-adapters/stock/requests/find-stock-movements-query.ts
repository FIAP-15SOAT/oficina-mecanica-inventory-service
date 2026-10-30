import { PaginationQuery } from '@domain/interfaces/common/pagination.interface';
import { StockMovementType } from '@domain/enums/stock-movement-type.enum';

export interface FindStockMovementsQuery extends PaginationQuery {
  partSupplyId?: string;
  workOrderId?: string;
  type?: StockMovementType;
  startDate?: string;
  endDate?: string;
}
