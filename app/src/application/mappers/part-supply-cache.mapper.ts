import { PartSupply } from '@domain/entities/part-supply.entity';
import { PartSupplyCategory } from '@domain/enums/part-supply-category.enum';
import { Unit } from '@domain/enums/unit.enum';
import { INVENTORY_CACHE_VERSION } from '@application/keys/inventory-cache-keys';

export interface CachedPartSupply {
  cacheVersion: number;
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
  version: number;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export class PartSupplyCacheMapper {
  static toCache(partSupply: PartSupply): CachedPartSupply {
    return {
      cacheVersion: INVENTORY_CACHE_VERSION,
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
      version: partSupply.version,
      expiresAt: partSupply.expiresAt?.toISOString() ?? null,
      createdAt: partSupply.createdAt.toISOString(),
      updatedAt: partSupply.updatedAt.toISOString(),
    };
  }

  static toDomain(cached: CachedPartSupply): PartSupply {
    return PartSupply.reconstitute({
      id: cached.id,
      name: cached.name,
      description: cached.description,
      sku: cached.sku,
      partNumber: cached.partNumber,
      category: cached.category,
      unit: cached.unit,
      costPrice: cached.costPrice,
      salePrice: cached.salePrice,
      stock: cached.stock,
      minStock: cached.minStock,
      reservedStock: cached.reservedStock,
      version: cached.version,
      expiresAt: cached.expiresAt ? new Date(cached.expiresAt) : null,
      createdAt: new Date(cached.createdAt),
      updatedAt: new Date(cached.updatedAt),
    });
  }
}
