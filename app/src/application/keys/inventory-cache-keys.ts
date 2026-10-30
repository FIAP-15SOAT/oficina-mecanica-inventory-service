// Bump when a cached shape changes: values written by the previous code then read as misses.
export const INVENTORY_CACHE_VERSION = 1;

// Single place that names the cache keys, so reads and invalidations cannot drift apart.
export const inventoryCacheKeys = {
  service: (id: string): string => `inventory:service:${id}`,
  partSupply: (id: string): string => `inventory:part-supply:${id}`,
};
