export interface ReserveStockInput {
  workOrderId: string;
  quoteId: string;
  items: { partSupplyId: string; quantity: number }[];
}

export type ReserveStockOutcome = 'reserved' | 'insufficient';

export interface IReserveStockUseCase {
  execute(input: ReserveStockInput): Promise<{ outcome: ReserveStockOutcome }>;
}
