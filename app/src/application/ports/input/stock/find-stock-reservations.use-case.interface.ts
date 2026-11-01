import { StockReservation } from '@domain/entities/stock-reservation.entity';
import { PaginatedResult } from '@domain/interfaces/common/pagination.interface';
import { FindStockReservationsInputDto } from './dto/find-stock-reservations.dto';

export interface IFindStockReservationsUseCase {
  execute(input: FindStockReservationsInputDto): Promise<PaginatedResult<StockReservation>>;
}
