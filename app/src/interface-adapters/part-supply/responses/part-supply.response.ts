import { PartSupplyCategory } from '@domain/enums/part-supply-category.enum';
import { Unit } from '@domain/enums/unit.enum';
import { PaginationMeta } from '@domain/interfaces/common/pagination.interface';

export interface PartSupplyResponse {
  id: string;
  name: string;
  description: string | null;
  sku: string;
  partNumber: string | null;
  category: PartSupplyCategory;
  unit: Unit;
  costPrice: number;
  salePrice: number;
  stock: number;
  minStock: number;
  reservedStock: number;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PartSupplyDataResponse {
  data: PartSupplyResponse;
}

export interface PartSupplyPaginatedResponse {
  data: PartSupplyResponse[];
  pagination: PaginationMeta;
}
