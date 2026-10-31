import { INVENTORY_CACHE_VERSION } from '@application/keys/inventory-cache-keys';
import { PartSupplyCacheMapper } from '@application/mappers/part-supply-cache.mapper';

import { createMockPartSupply } from '../../../helpers/part-supply-mock.factory';

describe('PartSupplyCacheMapper', () => {
  it('should round-trip a part or supply through the cached shape', () => {
    const partSupply = createMockPartSupply({
      description: 'Oil filter',
      reservedStock: 3,
      version: 4,
      expiresAt: new Date('2030-12-31T00:00:00.000Z'),
    });

    const restored = PartSupplyCacheMapper.toDomain(
      JSON.parse(JSON.stringify(PartSupplyCacheMapper.toCache(partSupply))),
    );

    expect(restored).toEqual(partSupply);
    expect(restored.createdAt).toBeInstanceOf(Date);
    expect(restored.updatedAt).toBeInstanceOf(Date);
    expect(restored.expiresAt).toBeInstanceOf(Date);
  });

  it('should round-trip a part or supply without expiry', () => {
    const partSupply = createMockPartSupply({ expiresAt: null, partNumber: null });

    const restored = PartSupplyCacheMapper.toDomain(
      JSON.parse(JSON.stringify(PartSupplyCacheMapper.toCache(partSupply))),
    );

    expect(restored).toEqual(partSupply);
    expect(restored.expiresAt).toBeNull();
  });

  it('should keep the stock, reserved stock, minimum stock and version', () => {
    const partSupply = createMockPartSupply({
      stock: 9,
      reservedStock: 2,
      minStock: 5,
      version: 7,
    });

    expect(PartSupplyCacheMapper.toCache(partSupply)).toMatchObject({
      stock: 9,
      reservedStock: 2,
      minStock: 5,
      version: 7,
    });
  });

  it('should stamp the current cache version', () => {
    expect(PartSupplyCacheMapper.toCache(createMockPartSupply()).cacheVersion).toBe(
      INVENTORY_CACHE_VERSION,
    );
  });

  it('should serialize the dates as ISO strings', () => {
    const partSupply = createMockPartSupply({ expiresAt: new Date('2030-12-31T00:00:00.000Z') });

    const cached = PartSupplyCacheMapper.toCache(partSupply);

    expect(cached.createdAt).toBe(partSupply.createdAt.toISOString());
    expect(cached.updatedAt).toBe(partSupply.updatedAt.toISOString());
    expect(cached.expiresAt).toBe('2030-12-31T00:00:00.000Z');
  });
});
