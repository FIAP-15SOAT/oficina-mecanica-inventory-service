import { PaginationInput } from '@domain/interfaces/common/pagination.interface';

export interface FindStockReservationsInputDto extends PaginationInput {
  partSupplyId?: string;
  workOrderId?: string;
}
