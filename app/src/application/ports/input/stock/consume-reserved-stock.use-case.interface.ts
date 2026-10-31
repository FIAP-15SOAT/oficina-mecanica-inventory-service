export interface ConsumeReservedStockInput {
  workOrderId: string;
}

export interface IConsumeReservedStockUseCase {
  execute(input: ConsumeReservedStockInput): Promise<{ consumedItemCount: number }>;
}
