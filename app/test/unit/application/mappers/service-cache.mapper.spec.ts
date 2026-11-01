import { INVENTORY_CACHE_VERSION } from '@application/keys/inventory-cache-keys';
import { ServiceCacheMapper } from '@application/mappers/service-cache.mapper';

import { createMockService } from '../../../helpers/service-mock.factory';

describe('ServiceCacheMapper', () => {
  it('should round-trip a service through the cached shape', () => {
    const service = createMockService({ description: null });

    const restored = ServiceCacheMapper.toDomain(
      JSON.parse(JSON.stringify(ServiceCacheMapper.toCache(service))),
    );

    expect(restored).toEqual(service);
    expect(restored.createdAt).toBeInstanceOf(Date);
    expect(restored.updatedAt).toBeInstanceOf(Date);
  });

  it('should stamp the current cache version', () => {
    expect(ServiceCacheMapper.toCache(createMockService()).cacheVersion).toBe(
      INVENTORY_CACHE_VERSION,
    );
  });

  it('should serialize the dates as ISO strings', () => {
    const service = createMockService();

    const cached = ServiceCacheMapper.toCache(service);

    expect(cached.createdAt).toBe(service.createdAt.toISOString());
    expect(cached.updatedAt).toBe(service.updatedAt.toISOString());
  });
});
