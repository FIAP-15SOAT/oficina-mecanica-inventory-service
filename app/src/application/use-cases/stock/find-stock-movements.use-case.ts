import { StockMovement } from '@domain/entities/stock-movement.entity';

import { IStockMovementRepository } from '@domain/interfaces/repositories/stock-movement.repository.interface';
import { IFindStockMovementsUseCase } from '@application/ports/input/stock/find-stock-movements.use-case.interface';

import { PaginatedResult, PaginationInput } from '@domain/interfaces/common/pagination.interface';
import { FindStockMovementsInputDto } from '@application/ports/input/stock/dto/find-stock-movements.dto';

import { buildPaginatedResult } from '@application/utils/pagination.util';

export class FindStockMovementsUseCase implements IFindStockMovementsUseCase {
  constructor(private readonly stockMovementRepository: IStockMovementRepository) {}

  async execute(input: FindStockMovementsInputDto): Promise<PaginatedResult<StockMovement>> {
    const { page, limit, ...filters } = input;
    const pagination: PaginationInput = { page, limit };

    const result = await this.stockMovementRepository.findAllPaginated(pagination, {
      ...filters,
      startDate: filters.startDate ? new Date(`${filters.startDate}T00:00:00.000Z`) : undefined,
      endDate: filters.endDate ? new Date(`${filters.endDate}T23:59:59.999Z`) : undefined,
    });

    return buildPaginatedResult(result, pagination);
  }
}
