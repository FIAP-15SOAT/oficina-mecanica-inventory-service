import { randomUUID } from 'node:crypto';

import { StockPresenter } from '@interface-adapters/stock/stock.presenter';

import { StockMovementType } from '@domain/enums/stock-movement-type.enum';

import { createMockPartSupply } from '../../../helpers/part-supply-mock.factory';
import { createMockStockMovement } from '../../../helpers/stock-movement-mock.factory';
import { createMockStockReservation } from '../../../helpers/stock-reservation-mock.factory';

describe('StockPresenter', () => {
  const pagination = { totalRecords: 1, totalPages: 1, page: 1, limit: 10 };

  describe('toPaginatedStockMovementsResponse', () => {
    it('should map a movement with the part summary and the work order reference only', () => {
      const partSupply = createMockPartSupply({ description: 'Filtro para motor 1.0' });
      const workOrderId = randomUUID();
      const movement = createMockStockMovement({
        partSupplyId: partSupply.id,
        workOrderId,
        type: StockMovementType.EXIT,
        quantity: 3,
        reason: 'Saída por Ordem de Serviço',
      });
      movement.partSupply = partSupply;

      const response = StockPresenter.toPaginatedStockMovementsResponse({
        items: [movement],
        pagination,
      });

      expect(response.pagination).toBe(pagination);
      expect(response.data).toEqual([
        {
          id: movement.id,
          partSupplyId: partSupply.id,
          partSupply: {
            id: partSupply.id,
            name: partSupply.name,
            description: 'Filtro para motor 1.0',
            sku: partSupply.sku,
            partNumber: partSupply.partNumber,
            category: partSupply.category,
            unit: partSupply.unit,
          },
          workOrderId,
          type: StockMovementType.EXIT,
          quantity: 3,
          reason: 'Saída por Ordem de Serviço',
          createdAt: movement.createdAt,
        },
      ]);
    });

    it('should not expose work order, customer, vehicle or assigned user', () => {
      const movement = createMockStockMovement();
      movement.partSupply = createMockPartSupply();

      const [item] = StockPresenter.toPaginatedStockMovementsResponse({
        items: [movement],
        pagination,
      }).data;

      expect(item).not.toHaveProperty('workOrder');
      expect(item).not.toHaveProperty('customer');
      expect(item).not.toHaveProperty('vehicle');
      expect(item).not.toHaveProperty('assignedUser');
    });

    it('should default nullable fields to null', () => {
      const movement = createMockStockMovement({
        workOrderId: undefined,
        reason: undefined,
        type: StockMovementType.ENTRY,
      });
      movement.partSupply = createMockPartSupply({ description: undefined, partNumber: undefined });

      const [item] = StockPresenter.toPaginatedStockMovementsResponse({
        items: [movement],
        pagination,
      }).data;

      expect(item.workOrderId).toBeNull();
      expect(item.reason).toBeNull();
      expect(item.partSupply.description).toBeNull();
      expect(item.partSupply.partNumber).toBeNull();
    });
  });

  describe('toPaginatedStockReservationsResponse', () => {
    it('should map a reservation with the part summary and the work order reference only', () => {
      const partSupply = createMockPartSupply();
      const reservation = createMockStockReservation({ partSupplyId: partSupply.id, quantity: 2 });
      reservation.partSupply = partSupply;

      const response = StockPresenter.toPaginatedStockReservationsResponse({
        items: [reservation],
        pagination,
      });

      expect(response.pagination).toBe(pagination);
      expect(response.data).toEqual([
        {
          id: reservation.id,
          partSupplyId: partSupply.id,
          partSupply: {
            id: partSupply.id,
            name: partSupply.name,
            description: null,
            sku: partSupply.sku,
            partNumber: partSupply.partNumber,
            category: partSupply.category,
            unit: partSupply.unit,
          },
          workOrderId: reservation.workOrderId,
          quantity: 2,
          createdAt: reservation.createdAt,
        },
      ]);
    });

    it('should not expose work order, customer, vehicle or assigned user', () => {
      const reservation = createMockStockReservation();
      reservation.partSupply = createMockPartSupply();

      const [item] = StockPresenter.toPaginatedStockReservationsResponse({
        items: [reservation],
        pagination,
      }).data;

      expect(item).not.toHaveProperty('workOrder');
      expect(item).not.toHaveProperty('customer');
      expect(item).not.toHaveProperty('vehicle');
      expect(item).not.toHaveProperty('assignedUser');
    });
  });
});
