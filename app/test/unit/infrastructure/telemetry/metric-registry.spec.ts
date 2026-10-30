import { AggregationType } from '@opentelemetry/sdk-metrics';

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

/** No inventory business metric is declared yet, so the registry is empty. */
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

describe('metric registry views', () => {
  afterEach(() => jest.restoreAllMocks());

  it('should build a view only for an entry with a custom aggregation', () => {
    // The registry is empty, so the entries are injected while the module loads.
    const explicit = {
      type: AggregationType.EXPLICIT_BUCKET_HISTOGRAM,
      options: { boundaries: [1] },
    };
    jest.spyOn(Object, 'values').mockReturnValueOnce([
      { key: 'oficina.test.default', aggregation: { type: AggregationType.DEFAULT } },
      { key: 'oficina.test.histogram', aggregation: explicit },
    ]);

    let isolated!: typeof import('@infrastructure/telemetry/metric-registry');

    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      isolated = require('@infrastructure/telemetry/metric-registry');
    });

    expect(isolated.METRIC_VIEWS).toEqual([
      { instrumentName: 'oficina.test.histogram', aggregation: explicit },
    ]);
  });
});
