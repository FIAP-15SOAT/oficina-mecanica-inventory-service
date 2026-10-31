import { StockMovementType } from '@domain/enums/stock-movement-type.enum';

export interface UpdateStockRequest {
  type: StockMovementType;
  quantity: number;
  reason?: string;
  workOrderId?: string;
}
