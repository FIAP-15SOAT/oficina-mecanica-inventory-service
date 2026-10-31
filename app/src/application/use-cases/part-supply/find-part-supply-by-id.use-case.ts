import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';
import { PartSupply } from '@domain/entities/part-supply.entity';
import { IPartSupplyRepository } from '@domain/interfaces/repositories/part-supply.repository.interface';
import { IFindPartSupplyByIdUseCase } from '@application/ports/input/part-supply/find-part-supply-by-id.use-case.interface';
import {
  INVENTORY_CACHE_VERSION,
  inventoryCacheKeys,
} from '@application/keys/inventory-cache-keys';
import {
  CachedPartSupply,
  PartSupplyCacheMapper,
} from '@application/mappers/part-supply-cache.mapper';
import { ICache } from '@application/ports/output/cache.service.interface';

export class FindPartSupplyByIdUseCase implements IFindPartSupplyByIdUseCase {
  constructor(
    private readonly partSupplyRepository: IPartSupplyRepository,
    private readonly cache: ICache,
  ) {}

  async execute(id: string): Promise<PartSupply> {
    const value = await this.cache.get(inventoryCacheKeys.partSupply(id));
    const cached = value === null ? null : this.parseCachedPartSupply(value);

    if (cached) {
      return cached;
    }

    const partSupply = await this.partSupplyRepository.findById(id);

    if (!partSupply) {
      throw new ResourceNotFoundException('Peça ou Insumo', id);
    }

    await this.cache.set(
      inventoryCacheKeys.partSupply(id),
      JSON.stringify(PartSupplyCacheMapper.toCache(partSupply)),
    );

    return partSupply;
  }

  // A value this code cannot read (corrupted or written by another version) is a miss.
  private parseCachedPartSupply(value: string): PartSupply | null {
    try {
      const cached = JSON.parse(value) as CachedPartSupply;

      return cached.cacheVersion === INVENTORY_CACHE_VERSION
        ? PartSupplyCacheMapper.toDomain(cached)
        : null;
    } catch {
      return null;
    }
  }
}
