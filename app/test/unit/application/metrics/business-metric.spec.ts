import { defineBusinessMetric } from '@application/metrics/business-metric';

describe('defineBusinessMetric', () => {
  it('should return the definition unchanged', () => {
    const definition = {
      name: 'inventory.test' as never,
      kind: 'counter' as const,
      unit: '{item}',
      description: 'test metric',
    };

    expect(defineBusinessMetric(definition)).toBe(definition);
  });
});
