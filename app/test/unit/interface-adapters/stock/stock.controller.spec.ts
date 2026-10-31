import { StockController } from '@interface-adapters/stock/stock.controller';
import { StockPresenter } from '@interface-adapters/stock/stock.presenter';

import { IFindStockMovementsUseCase } from '@application/ports/input/stock/find-stock-movements.use-case.interface';
import { IFindStockReservationsUseCase } from '@application/ports/input/stock/find-stock-reservations.use-case.interface';

import { createMockPartSupply } from '../../../helpers/part-supply-mock.factory';
import { createMockStockMovement } from '../../../helpers/stock-movement-mock.factory';
import { createMockStockReservation } from '../../../helpers/stock-reservation-mock.factory';

describe('StockController', () => {
  let controller: StockController;
  let findMovementsUseCase: jest.Mocked<IFindStockMovementsUseCase>;
  let findReservationsUseCase: jest.Mocked<IFindStockReservationsUseCase>;

  const partSupply = createMockPartSupply();

  beforeEach(() => {
    findMovementsUseCase = { execute: jest.fn() };
    findReservationsUseCase = { execute: jest.fn() };
    controller = new StockController(findMovementsUseCase, findReservationsUseCase);
  });

  describe('getStockMovements', () => {
    it('should default page and limit when missing and forward filters', async () => {
      const movement = createMockStockMovement({ partSupplyId: partSupply.id });
      movement.partSupply = partSupply;
      const page = {
        items: [movement],
        pagination: { totalRecords: 1, totalPages: 1, page: 1, limit: 10 },
      };
      findMovementsUseCase.execute.mockResolvedValue(page);

      const result = await controller.getStockMovements({ partSupplyId: partSupply.id });

      expect(result).toEqual(StockPresenter.toPaginatedStockMovementsResponse(page));
      expect(findMovementsUseCase.execute).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        partSupplyId: partSupply.id,
      });
    });

    it('should forward provided page, limit and date range', async () => {
      findMovementsUseCase.execute.mockResolvedValue({
        items: [],
        pagination: { totalRecords: 0, totalPages: 0, page: 2, limit: 5 },
      });

      await controller.getStockMovements({
        page: 2,
        limit: 5,
        startDate: '2025-01-01',
        endDate: '2025-01-31',
      });

      expect(findMovementsUseCase.execute).toHaveBeenCalledWith({
        page: 2,
        limit: 5,
        startDate: '2025-01-01',
        endDate: '2025-01-31',
      });
    });
  });

  describe('getStockReservations', () => {
    it('should default page and limit when missing and forward filters', async () => {
      const reservation = createMockStockReservation({ partSupplyId: partSupply.id });
      reservation.partSupply = partSupply;
      const page = {
        items: [reservation],
        pagination: { totalRecords: 1, totalPages: 1, page: 1, limit: 10 },
      };
      findReservationsUseCase.execute.mockResolvedValue(page);

      const result = await controller.getStockReservations({
        workOrderId: reservation.workOrderId,
      });

      expect(result).toEqual(StockPresenter.toPaginatedStockReservationsResponse(page));
      expect(findReservationsUseCase.execute).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        workOrderId: reservation.workOrderId,
      });
    });

    it('should forward provided page and limit', async () => {
      findReservationsUseCase.execute.mockResolvedValue({
        items: [],
        pagination: { totalRecords: 0, totalPages: 0, page: 2, limit: 5 },
      });

      await controller.getStockReservations({ page: 2, limit: 5 });

      expect(findReservationsUseCase.execute).toHaveBeenCalledWith({ page: 2, limit: 5 });
    });
  });
});
