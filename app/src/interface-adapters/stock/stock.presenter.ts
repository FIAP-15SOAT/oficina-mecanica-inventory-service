import { PartSupply } from '@domain/entities/part-supply.entity';
import { StockMovement } from '@domain/entities/stock-movement.entity';
import { StockReservation } from '@domain/entities/stock-reservation.entity';
import { PaginatedResult } from '@domain/interfaces/common/pagination.interface';
import {
  StockMovementPaginatedResponse,
  StockMovementResponse,
  StockPartSupplyResponse,
  StockReservationPaginatedResponse,
  StockReservationResponse,
} from './responses/stock.response';

export class StockPresenter {
  static toPaginatedStockMovementsResponse(
    result: PaginatedResult<StockMovement>,
  ): StockMovementPaginatedResponse {
    return {
      data: result.items.map((item) => StockPresenter.toStockMovementResponse(item)),
      pagination: result.pagination,
    };
  }

  static toPaginatedStockReservationsResponse(
    result: PaginatedResult<StockReservation>,
  ): StockReservationPaginatedResponse {
    return {
      data: result.items.map((item) => StockPresenter.toStockReservationResponse(item)),
      pagination: result.pagination,
    };
  }

  private static toStockMovementResponse(item: StockMovement): StockMovementResponse {
    return {
      id: item.id,
      partSupplyId: item.partSupplyId,
      partSupply: StockPresenter.mapPartSupplyData(item.partSupply!),
      workOrderId: item.workOrderId ?? null,
      type: item.type,
      quantity: item.quantity,
      reason: item.reason ?? null,
      createdAt: item.createdAt,
    };
  }

  private static toStockReservationResponse(item: StockReservation): StockReservationResponse {
    return {
      id: item.id,
      partSupplyId: item.partSupplyId,
      partSupply: StockPresenter.mapPartSupplyData(item.partSupply!),
      workOrderId: item.workOrderId,
      quantity: item.quantity,
      createdAt: item.createdAt,
    };
  }

  private static mapPartSupplyData(p: PartSupply): StockPartSupplyResponse {
    return {
      id: p.id,
      name: p.name,
      description: p.description ?? null,
      sku: p.sku,
      partNumber: p.partNumber ?? null,
      category: p.category,
      unit: p.unit,
    };
  }
}
