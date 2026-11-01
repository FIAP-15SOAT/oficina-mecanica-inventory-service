import { StockMovementType } from '@domain/enums/stock-movement-type.enum';
import { PartSupplyCategory } from '@domain/enums/part-supply-category.enum';
import { Unit } from '@domain/enums/unit.enum';
import { PaginationMeta } from '@domain/interfaces/common/pagination.interface';

export interface StockPartSupplyResponse {
  id: string;
  name: string;
  description: string | null;
  sku: string;
  partNumber: string | null;
  category: PartSupplyCategory;
  unit: Unit;
}

export interface StockMovementResponse {
  id: string;
  partSupplyId: string;
  partSupply: StockPartSupplyResponse;
  workOrderId: string | null;
  type: StockMovementType;
  quantity: number;
  reason: string | null;
  createdAt: Date;
}

export interface StockReservationResponse {
  id: string;
  partSupplyId: string;
  partSupply: StockPartSupplyResponse;
  workOrderId: string;
  quantity: number;
  createdAt: Date;
}

export interface StockMovementPaginatedResponse {
  data: StockMovementResponse[];
  pagination: PaginationMeta;
}

export interface StockReservationPaginatedResponse {
  data: StockReservationResponse[];
  pagination: PaginationMeta;
}
