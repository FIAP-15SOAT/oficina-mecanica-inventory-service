import { PartSupply } from '@domain/entities/part-supply.entity';
import { PaginatedResult } from '@domain/interfaces/common/pagination.interface';
import {
  PartSupplyDataResponse,
  PartSupplyPaginatedResponse,
  PartSupplyResponse,
} from './responses/part-supply.response';

export class PartSupplyPresenter {
  static toResponse(partSupply: PartSupply): PartSupplyResponse {
    return {
      id: partSupply.id,
      name: partSupply.name,
      description: partSupply.description,
      sku: partSupply.sku,
      partNumber: partSupply.partNumber,
      category: partSupply.category,
      unit: partSupply.unit,
      costPrice: partSupply.costPrice,
      salePrice: partSupply.salePrice,
      stock: partSupply.stock,
      minStock: partSupply.minStock,
      reservedStock: partSupply.reservedStock,
      expiresAt: partSupply.expiresAt,
      createdAt: partSupply.createdAt,
      updatedAt: partSupply.updatedAt,
    };
  }

  static toDataResponse(partSupply: PartSupply): PartSupplyDataResponse {
    return { data: PartSupplyPresenter.toResponse(partSupply) };
  }

  static toPaginatedDataResponse(result: PaginatedResult<PartSupply>): PartSupplyPaginatedResponse {
    return {
      data: result.items.map((p) => PartSupplyPresenter.toResponse(p)),
      pagination: result.pagination,
    };
  }
}
