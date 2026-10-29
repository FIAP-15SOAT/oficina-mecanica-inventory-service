import { MetricAttributes } from './metric-attribute';

// Inventory business metrics enter with the catalog (C-15).
export type BusinessMetricName = never;

export type MetricInstrumentKind = 'counter' | 'histogram';

declare const METRIC_ATTRIBUTES: unique symbol;

export interface BusinessMetricDefinition<TAttributes extends MetricAttributes = MetricAttributes> {
  readonly name: BusinessMetricName;
  readonly kind: MetricInstrumentKind;
  readonly unit: string;
  readonly description: string;
  readonly [METRIC_ATTRIBUTES]?: TAttributes;
}

export function defineBusinessMetric<TAttributes extends MetricAttributes>(
  definition: BusinessMetricDefinition<TAttributes>,
): BusinessMetricDefinition<TAttributes> {
  return definition;
}
