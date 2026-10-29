import {
  METRIC_ATTRIBUTE_REGISTRY,
  METRIC_REGISTRY,
  METRIC_VIEWS,
  MetricCardinality,
  resolveMetricAttribute,
  resolveMetricKey,
} from '@infrastructure/telemetry/metric-registry';

type Assert<T extends true> = T;

/**
 * `high` is not part of the type: declaring high cardinality on a metric
 * attribute is a **compile error**, not a forgotten review. It is what keeps an
 * entity identifier from becoming a dimension and multiplying series without
 * limit.
 */
type _NoHighCardinalityAttribute = Assert<'high' extends MetricCardinality ? false : true>;

/** The inventory business metrics enter with the catalog (C-15); until then the registry is empty. */
describe('metric registry', () => {
  it('should declare no metric and no attribute yet', () => {
    expect(METRIC_REGISTRY).toEqual({});
    expect(METRIC_ATTRIBUTE_REGISTRY).toEqual({});
  });

  it('should declare no view while no metric needs a custom aggregation', () => {
    expect(METRIC_VIEWS).toEqual([]);
  });

  it('should fail to resolve a metric outside the registry', () => {
    expect(() => resolveMetricKey('unknown' as never)).toThrow(TypeError);
  });

  it('should return undefined for an attribute outside the logical vocabulary', () => {
    expect(resolveMetricAttribute('workOrderId')).toBeUndefined();
  });
});
