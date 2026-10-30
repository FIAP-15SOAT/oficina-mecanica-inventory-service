import { PaginationQuery } from '@domain/interfaces/common/pagination.interface';

export interface FindStockReservationsQuery extends PaginationQuery {
  partSupplyId?: string;
  workOrderId?: string;
}
