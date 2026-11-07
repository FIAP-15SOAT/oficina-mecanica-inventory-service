export interface ReserveStockInput {
  workOrderId: string;
  quoteId: string;
  items: { partSupplyId: string; quantity: number }[];
}
