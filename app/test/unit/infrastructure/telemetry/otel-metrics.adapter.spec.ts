import { metrics } from '@opentelemetry/api';
import {
  AggregationTemporality,
  DataPointType,
  InMemoryMetricExporter,
  MeterProvider,
  PeriodicExportingMetricReader,
  ResourceMetrics,
} from '@opentelemetry/sdk-metrics';

import { BusinessMetricDefinition } from '@application/metrics/business-metric';
import { OtelMetricsAdapter } from '@infrastructure/telemetry/otel-metrics.adapter';
import { captureDiagnostics, DiagnosticsCapture } from '../../../helpers/diagnostics-capture';

// The registry is empty: the adapter is exercised
// against a test registry with one counter, one exponential histogram and one attribute.
jest.mock('@infrastructure/telemetry/metric-registry', () => {
  const { AggregationType } = jest.requireActual<typeof import('@opentelemetry/sdk-metrics')>(
    '@opentelemetry/sdk-metrics',
  );
  const registry: Record<string, string> = {
    'test.created': 'oficina.test.created',
    'test.duration': 'oficina.test.duration',
  };
  const attributes: Record<string, { key: string; cardinality: string }> = {
    testStatus: { key: 'oficina.test.status', cardinality: 'low' },
  };

  return {
    METRIC_VIEWS: [
      {
        instrumentName: 'oficina.test.duration',
        aggregation: { type: AggregationType.EXPONENTIAL_HISTOGRAM },
      },
    ],
    resolveMetricKey: (name: string) => registry[name],
    resolveMetricAttribute: (name: string) => attributes[name],
  };
});

import { METRIC_VIEWS } from '@infrastructure/telemetry/metric-registry';

const TEST_METRICS = {
  CREATED: {
    name: 'test.created',
    kind: 'counter',
    unit: '{item}',
    description: 'test counter',
  } as unknown as BusinessMetricDefinition<Record<never, never>>,
  DURATION: {
    name: 'test.duration',
    kind: 'histogram',
    unit: 's',
    description: 'test duration',
  } as unknown as BusinessMetricDefinition<{ testStatus: string }>,
  PLAIN_DURATION: {
    name: 'test.duration',
    kind: 'histogram',
    unit: 's',
    description: 'test duration',
  } as unknown as BusinessMetricDefinition<Record<never, never>>,
};

const STATUS_KEY = 'oficina.test.status';

const ONE_MINUTE_SECONDS = 60;
const THREE_HOURS_SECONDS = 3 * 60 * 60;
const FIVE_DAYS_SECONDS = 5 * 24 * 60 * 60;

interface Harness {
  adapter: OtelMetricsAdapter;
  collect: () => Promise<ResourceMetrics>;
  shutdown: () => Promise<void>;
}

function createHarness(): Harness {
  const exporter = new InMemoryMetricExporter(AggregationTemporality.DELTA);
  const reader = new PeriodicExportingMetricReader({
    exporter,
    exportIntervalMillis: 600_000,
    exportTimeoutMillis: 5_000,
  });
  const provider = new MeterProvider({ readers: [reader], views: [...METRIC_VIEWS] });

  metrics.setGlobalMeterProvider(provider);

  return {
    adapter: new OtelMetricsAdapter(),
    collect: async () => (await reader.collect()).resourceMetrics,
    shutdown: async () => {
      await provider.shutdown();
      metrics.disable();
    },
  };
}

function findMetric(resourceMetrics: ResourceMetrics, name: string) {
  return resourceMetrics.scopeMetrics
    .flatMap((scope) => scope.metrics)
    .find((metric) => metric.descriptor.name === name);
}

describe('OtelMetricsAdapter', () => {
  let harness: Harness;

  beforeEach(() => {
    harness = createHarness();
  });

  afterEach(async () => {
    await harness.shutdown();
  });

  describe('logical to physical name translation', () => {
    it('should emit the counter under the registry physical name, in the owned namespace', async () => {
      harness.adapter.increment(TEST_METRICS.CREATED, {});

      const metric = findMetric(await harness.collect(), 'oficina.test.created');

      expect(metric?.descriptor.unit).toBe('{item}');
      expect(metric?.dataPoints[0].value).toBe(1);
    });

    it('should translate the logical attribute name to the declared physical key', async () => {
      harness.adapter.record(TEST_METRICS.DURATION, 42, {
        testStatus: 'APPROVED',
      });

      const metric = findMetric(await harness.collect(), 'oficina.test.duration');

      expect(metric?.dataPoints[0].attributes).toEqual({
        [STATUS_KEY]: 'APPROVED',
      });
      expect(metric?.descriptor.unit).toBe('s');
    });
  });

  describe('undeclared attribute rejection', () => {
    let diagnostics: DiagnosticsCapture;

    beforeEach(() => {
      diagnostics = captureDiagnostics();
    });

    afterEach(() => {
      diagnostics.restore();
    });

    /**
     * The per-metric restriction is compile-time (`NoExtraFields`); this is the
     * second line, against whatever slips through an `as`. An unknown attribute
     * emitted under the raw name would reach the destination as a new series.
     */
    it('should drop an attribute the logical vocabulary does not know', async () => {
      harness.adapter.record(TEST_METRICS.DURATION, 10, {
        testStatus: 'APPROVED',
        workOrderId: 'e2a1b0c4-0000-4000-8000-000000000000',
      } as unknown as { testStatus: string });

      const metric = findMetric(await harness.collect(), 'oficina.test.duration');

      expect(metric?.dataPoints[0].attributes).toEqual({
        [STATUS_KEY]: 'APPROVED',
      });
      expect(diagnostics.text()).toContain('undeclared-attribute:workOrderId');
    });

    /**
     * A missing attribute becomes neither a new series nor the string
     * "undefined": it is left out, and the metric stays comparable to the others.
     */
    it('should ignore an attribute whose value was not provided', async () => {
      harness.adapter.record(TEST_METRICS.DURATION, 5, {
        testStatus: undefined,
      } as unknown as { testStatus: string });

      const metric = findMetric(await harness.collect(), 'oficina.test.duration');

      expect(metric?.dataPoints[0].attributes).toEqual({});
      expect(diagnostics.text()).toBe('');
    });

    it('should drop an attribute value that is not an accepted primitive', async () => {
      harness.adapter.record(TEST_METRICS.DURATION, 5, {
        testStatus: { toString: () => 'APPROVED' },
      } as unknown as { testStatus: string });

      const metric = findMetric(await harness.collect(), 'oficina.test.duration');

      expect(metric?.dataPoints[0].attributes).toEqual({});
      expect(diagnostics.text()).toContain('invalid-attribute-value:testStatus');
    });

    it('should report and not emit when the instrument does not match the operation', async () => {
      harness.adapter.increment(TEST_METRICS.DURATION, {} as never);

      expect(findMetric(await harness.collect(), 'oficina.test.duration')).toBeUndefined();
      expect(diagnostics.text()).toContain('instrument-mismatch');
    });

    /**
     * Non-throwing boundary: an already committed business operation must never
     * turn into an error because of telemetry.
     */
    it('should absorb an emission failure without propagating', () => {
      const failing = new OtelMetricsAdapter();
      jest
        .spyOn(failing as unknown as { resolveCounter: () => never }, 'resolveCounter')
        .mockImplementation(() => {
          throw new Error('meter indisponível');
        });

      expect(() => failing.increment(TEST_METRICS.CREATED, {})).not.toThrow();
      expect(diagnostics.text()).toContain('metric-emission');
    });
  });

  describe('instrument lifecycle', () => {
    it('should create the instrument only once across emissions', async () => {
      const createCounter = jest.spyOn(metrics.getMeter('probe'), 'createCounter');
      const adapter = new OtelMetricsAdapter();

      adapter.increment(TEST_METRICS.CREATED, {});
      adapter.increment(TEST_METRICS.CREATED, {});
      adapter.increment(TEST_METRICS.CREATED, {});

      const metric = findMetric(await harness.collect(), 'oficina.test.created');

      expect(metric?.dataPoints).toHaveLength(1);
      expect(metric?.dataPoints[0].value).toBe(3);

      createCounter.mockRestore();
    });
  });

  describe('aggregation declared in the registry', () => {
    /**
     * The default histogram aggregation ends at 10 000 and is sized for request
     * **milliseconds**; dwell times range from minutes to days in **seconds**,
     * and every observation would land in the last bucket. The average would
     * stay right and the percentiles — the dashboard's reason to exist — would
     * mean nothing, with nothing failing.
     */
    it('should place 60 s, 3 h and 5 days in different buckets', async () => {
      for (const seconds of [ONE_MINUTE_SECONDS, THREE_HOURS_SECONDS, FIVE_DAYS_SECONDS]) {
        harness.adapter.record(TEST_METRICS.PLAIN_DURATION, seconds, {});
      }

      const metric = findMetric(await harness.collect(), 'oficina.test.duration');

      expect(metric?.dataPointType).toBe(DataPointType.EXPONENTIAL_HISTOGRAM);

      const point = metric?.dataPoints[0].value as {
        count: number;
        min: number;
        max: number;
        positive: { bucketCounts: number[] };
      };

      expect(point.count).toBe(3);
      expect(point.min).toBe(ONE_MINUTE_SECONDS);
      expect(point.max).toBe(FIVE_DAYS_SECONDS);
      expect(point.positive.bucketCounts.filter((count) => count > 0)).toHaveLength(3);
    });

    it('should register the views declared in the registry', () => {
      expect(METRIC_VIEWS.map((view) => view.instrumentName)).toEqual(['oficina.test.duration']);
    });
  });
});
