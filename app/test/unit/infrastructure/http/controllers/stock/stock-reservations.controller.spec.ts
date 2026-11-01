import { StockReservationsController } from '@infrastructure/http/controllers/stock/stock-reservations.controller';
import { FindStockReservationsQueryDto } from '@infrastructure/http/controllers/stock/dto/requests/filter-stock-reservations.dto';

import { StockController } from '@interface-adapters/stock/stock.controller';
import { StockPresenter } from '@interface-adapters/stock/stock.presenter';

import { createMockPartSupply } from '../../../../../helpers/part-supply-mock.factory';
import { createMockStockReservation } from '../../../../../helpers/stock-reservation-mock.factory';

describe('StockReservationsController', () => {
  let httpController: StockReservationsController;
  let cleanController: StockController;

  beforeEach(() => {
    cleanController = new StockController({ execute: jest.fn() }, { execute: jest.fn() });
    httpController = new StockReservationsController(cleanController);
  });

  it('should pass the query straight to the clean controller and return its result', async () => {
    const partSupply = createMockPartSupply();
    const reservation = createMockStockReservation({ partSupplyId: partSupply.id });
    reservation.partSupply = partSupply;
    const query: FindStockReservationsQueryDto = {
      page: 1,
      limit: 10,
      workOrderId: reservation.workOrderId,
    };
    const response = StockPresenter.toPaginatedStockReservationsResponse({
      items: [reservation],
      pagination: { totalRecords: 1, totalPages: 1, page: 1, limit: 10 },
    });
    jest.spyOn(cleanController, 'getStockReservations').mockResolvedValue(response);

    const result = await httpController.getStockReservations(query);

    expect(result).toBe(response);
    expect(cleanController.getStockReservations).toHaveBeenCalledWith(query);
  });
});
