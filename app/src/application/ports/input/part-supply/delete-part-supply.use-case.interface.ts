export interface IDeletePartSupplyUseCase {
  execute(id: string): Promise<void>;
}
