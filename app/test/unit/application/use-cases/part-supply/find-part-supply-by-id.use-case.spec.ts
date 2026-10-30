import { FindPartSupplyByIdUseCase } from '@application/use-cases/part-supply/find-part-supply-by-id.use-case';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';
import {
  INVENTORY_CACHE_VERSION,
  inventoryCacheKeys,
} from '@application/keys/inventory-cache-keys';
import { PartSupplyCacheMapper } from '@application/mappers/part-supply-cache.mapper';
import { ICache } from '@application/ports/output/cache.service.interface';
import { IPartSupplyRepository } from '@domain/interfaces/repositories/part-supply.repository.interface';
import { createMockCache } from '../../../../helpers/cache-mock.factory';
import {
  createMockPartSupply,
  createMockPartSupplyRepository,
} from '../../../../helpers/part-supply-mock.factory';

describe('FindPartSupplyByIdUseCase', () => {
  let useCase: FindPartSupplyByIdUseCase;
  let partSupplyRepository: jest.Mocked<IPartSupplyRepository>;
  let cache: jest.Mocked<ICache>;

  beforeEach(() => {
    partSupplyRepository = createMockPartSupplyRepository();
    cache = createMockCache();
    useCase = new FindPartSupplyByIdUseCase(partSupplyRepository, cache);
  });

  it('should read the repository and cache the part or supply on a miss', async () => {
    const partSupply = createMockPartSupply();

    partSupplyRepository.findById.mockResolvedValue(partSupply);

    const result = await useCase.execute(partSupply.id);

    expect(result).toBe(partSupply);
    expect(cache.get).toHaveBeenCalledWith(inventoryCacheKeys.partSupply(partSupply.id));
    expect(partSupplyRepository.findById).toHaveBeenCalledWith(partSupply.id);
    expect(cache.set).toHaveBeenCalledWith(
      inventoryCacheKeys.partSupply(partSupply.id),
      JSON.stringify(PartSupplyCacheMapper.toCache(partSupply)),
    );
  });

  it('should return the cached part or supply without touching the repository on a hit', async () => {
    const partSupply = createMockPartSupply({ reservedStock: 2, version: 3 });

    cache.get.mockResolvedValue(JSON.stringify(PartSupplyCacheMapper.toCache(partSupply)));

    const result = await useCase.execute(partSupply.id);

    expect(result).toEqual(partSupply);
    expect(partSupplyRepository.findById).not.toHaveBeenCalled();
    expect(cache.set).not.toHaveBeenCalled();
  });

  it('should treat an unreadable cached value as a miss', async () => {
    const partSupply = createMockPartSupply();

    cache.get.mockResolvedValue('{not json');
    partSupplyRepository.findById.mockResolvedValue(partSupply);

    const result = await useCase.execute(partSupply.id);

    expect(result).toBe(partSupply);
    expect(cache.set).toHaveBeenCalledTimes(1);
  });

  it('should treat a cached value of another version as a miss', async () => {
    const partSupply = createMockPartSupply();

    cache.get.mockResolvedValue(
      JSON.stringify({
        ...PartSupplyCacheMapper.toCache(partSupply),
        cacheVersion: INVENTORY_CACHE_VERSION + 1,
      }),
    );
    partSupplyRepository.findById.mockResolvedValue(partSupply);

    const result = await useCase.execute(partSupply.id);

    expect(result).toBe(partSupply);
    expect(partSupplyRepository.findById).toHaveBeenCalledWith(partSupply.id);
  });

  it('should throw ResourceNotFoundException and cache nothing when not found in Stock', async () => {
    partSupplyRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute('uuid-999')).rejects.toThrow(ResourceNotFoundException);

    expect(cache.set).not.toHaveBeenCalled();
  });
});
