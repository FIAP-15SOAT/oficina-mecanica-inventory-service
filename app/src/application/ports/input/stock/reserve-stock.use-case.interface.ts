import { ReserveStockInput } from './dto/reserve-stock.dto';

export interface IReserveStockUseCase {
  execute(input: ReserveStockInput): Promise<void>;
}
