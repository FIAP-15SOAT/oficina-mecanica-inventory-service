export interface IConsumeReservedStockUseCase {
  execute(workOrderId: string): Promise<void>;
}
