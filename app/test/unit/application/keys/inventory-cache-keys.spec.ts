import {
  INVENTORY_CACHE_VERSION,
  inventoryCacheKeys,
} from '@application/keys/inventory-cache-keys';

describe('inventoryCacheKeys', () => {
  it('should build the service key from the id', () => {
    expect(inventoryCacheKeys.service('abc')).toBe('inventory:service:abc');
  });

  it('should build the part supply key from the id', () => {
    expect(inventoryCacheKeys.partSupply('abc')).toBe('inventory:part-supply:abc');
  });

  it('should expose a positive integer cache version', () => {
    expect(Number.isInteger(INVENTORY_CACHE_VERSION)).toBe(true);
    expect(INVENTORY_CACHE_VERSION).toBeGreaterThan(0);
  });
});
