import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';
import {
  INVENTORY_CACHE_VERSION,
  inventoryCacheKeys,
} from '@application/keys/inventory-cache-keys';
import { ServiceCacheMapper } from '@application/mappers/service-cache.mapper';
import { ICache } from '@application/ports/output/cache.service.interface';
import { FindServiceByIdUseCase } from '@application/use-cases/service/find-service-by-id.use-case';
import { IServiceRepository } from '@domain/interfaces/repositories/service.repository.interface';
import { createMockCache } from '../../../../helpers/cache-mock.factory';
import {
  createMockService,
  createMockServiceRepository,
} from '../../../../helpers/service-mock.factory';

describe('FindServiceByIdUseCase', () => {
  let useCase: FindServiceByIdUseCase;
  let serviceRepository: jest.Mocked<IServiceRepository>;
  let cache: jest.Mocked<ICache>;

  beforeEach(() => {
    serviceRepository = createMockServiceRepository();
    cache = createMockCache();
    useCase = new FindServiceByIdUseCase(serviceRepository, cache);
  });

  it('should read the repository and cache the service on a miss', async () => {
    const service = createMockService();

    serviceRepository.findById.mockResolvedValue(service);

    const result = await useCase.execute(service.id);

    expect(result).toBe(service);
    expect(cache.get).toHaveBeenCalledWith(inventoryCacheKeys.service(service.id));
    expect(serviceRepository.findById).toHaveBeenCalledWith(service.id);
    expect(cache.set).toHaveBeenCalledWith(
      inventoryCacheKeys.service(service.id),
      JSON.stringify(ServiceCacheMapper.toCache(service)),
    );
  });

  it('should return the cached service without touching the repository on a hit', async () => {
    const service = createMockService();

    cache.get.mockResolvedValue(JSON.stringify(ServiceCacheMapper.toCache(service)));

    const result = await useCase.execute(service.id);

    expect(result).toEqual(service);
    expect(serviceRepository.findById).not.toHaveBeenCalled();
    expect(cache.set).not.toHaveBeenCalled();
  });

  it('should treat an unreadable cached value as a miss', async () => {
    const service = createMockService();

    cache.get.mockResolvedValue('{not json');
    serviceRepository.findById.mockResolvedValue(service);

    const result = await useCase.execute(service.id);

    expect(result).toBe(service);
    expect(cache.set).toHaveBeenCalledTimes(1);
  });

  it('should treat a cached value of another version as a miss', async () => {
    const service = createMockService();

    cache.get.mockResolvedValue(
      JSON.stringify({
        ...ServiceCacheMapper.toCache(service),
        cacheVersion: INVENTORY_CACHE_VERSION + 1,
      }),
    );
    serviceRepository.findById.mockResolvedValue(service);

    const result = await useCase.execute(service.id);

    expect(result).toBe(service);
    expect(serviceRepository.findById).toHaveBeenCalledWith(service.id);
  });

  it('should throw ResourceNotFoundException and cache nothing when the service does not exist', async () => {
    serviceRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute('non-existent-id')).rejects.toThrow(ResourceNotFoundException);

    expect(serviceRepository.findById).toHaveBeenCalledWith('non-existent-id');
    expect(cache.set).not.toHaveBeenCalled();
  });
});
