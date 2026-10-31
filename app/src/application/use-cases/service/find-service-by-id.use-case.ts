import { Service } from '@domain/entities/service.entity';
import { IServiceRepository } from '@domain/interfaces/repositories/service.repository.interface';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';
import {
  INVENTORY_CACHE_VERSION,
  inventoryCacheKeys,
} from '@application/keys/inventory-cache-keys';
import { CachedService, ServiceCacheMapper } from '@application/mappers/service-cache.mapper';
import { ICache } from '@application/ports/output/cache.service.interface';

export class FindServiceByIdUseCase {
  constructor(
    private readonly serviceRepository: IServiceRepository,
    private readonly cache: ICache,
  ) {}

  async execute(id: string): Promise<Service> {
    const value = await this.cache.get(inventoryCacheKeys.service(id));
    const cached = value === null ? null : this.parseCachedService(value);

    if (cached) {
      return cached;
    }

    const service = await this.serviceRepository.findById(id);

    if (!service) {
      throw new ResourceNotFoundException('Serviço', id);
    }

    await this.cache.set(
      inventoryCacheKeys.service(id),
      JSON.stringify(ServiceCacheMapper.toCache(service)),
    );

    return service;
  }

  // A value this code cannot read (corrupted or written by another version) is a miss.
  private parseCachedService(value: string): Service | null {
    try {
      const cached = JSON.parse(value) as CachedService;

      return cached.cacheVersion === INVENTORY_CACHE_VERSION
        ? ServiceCacheMapper.toDomain(cached)
        : null;
    } catch {
      return null;
    }
  }
}
