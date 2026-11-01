export interface ReserveStockInput {
  workOrderId: string;
  quoteId: string;
  items: { partSupplyId: string; quantity: number }[];
}

export interface IReserveStockUseCase {
  execute(input: ReserveStockInput): Promise<void>;
}
