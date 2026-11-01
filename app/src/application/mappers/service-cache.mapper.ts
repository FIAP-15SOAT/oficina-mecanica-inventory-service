import { Service } from '@domain/entities/service.entity';
import { INVENTORY_CACHE_VERSION } from '@application/keys/inventory-cache-keys';

export interface CachedService {
  cacheVersion: number;
  id: string;
  name: string;
  description: string | null;
  basePrice: number;
  estimatedTimeMin: number;
  createdAt: string;
  updatedAt: string;
}

export class ServiceCacheMapper {
  static toCache(service: Service): CachedService {
    return {
      cacheVersion: INVENTORY_CACHE_VERSION,
      id: service.id,
      name: service.name,
      description: service.description,
      basePrice: service.basePrice,
      estimatedTimeMin: service.estimatedTimeMin,
      createdAt: service.createdAt.toISOString(),
      updatedAt: service.updatedAt.toISOString(),
    };
  }

  static toDomain(cached: CachedService): Service {
    return Service.reconstitute({
      id: cached.id,
      name: cached.name,
      description: cached.description,
      basePrice: cached.basePrice,
      estimatedTimeMin: cached.estimatedTimeMin,
      createdAt: new Date(cached.createdAt),
      updatedAt: new Date(cached.updatedAt),
    });
  }
}
