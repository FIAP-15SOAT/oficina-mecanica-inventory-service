import { IFindStockMovementsUseCase } from '@application/ports/input/stock/find-stock-movements.use-case.interface';
import { IFindStockReservationsUseCase } from '@application/ports/input/stock/find-stock-reservations.use-case.interface';

import { FindStockMovementsQuery } from './requests/find-stock-movements-query';
import { FindStockReservationsQuery } from './requests/find-stock-reservations-query';

import { StockPresenter } from './stock.presenter';
import {
  StockMovementPaginatedResponse,
  StockReservationPaginatedResponse,
} from './responses/stock.response';

export class StockController {
  constructor(
    private readonly findStockMovementsUseCase: IFindStockMovementsUseCase,
    private readonly findStockReservationsUseCase: IFindStockReservationsUseCase,
  ) {}

  async getStockMovements(query: FindStockMovementsQuery): Promise<StockMovementPaginatedResponse> {
    const result = await this.findStockMovementsUseCase.execute({
      ...query,
      page: query.page ?? 1,
      limit: query.limit ?? 10,
    });

    return StockPresenter.toPaginatedStockMovementsResponse(result);
  }

  async getStockReservations(
    query: FindStockReservationsQuery,
  ): Promise<StockReservationPaginatedResponse> {
    const result = await this.findStockReservationsUseCase.execute({
      ...query,
      page: query.page ?? 1,
      limit: query.limit ?? 10,
    });

    return StockPresenter.toPaginatedStockReservationsResponse(result);
  }
}
