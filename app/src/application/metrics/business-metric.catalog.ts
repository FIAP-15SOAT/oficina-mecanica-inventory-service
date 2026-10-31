import { defineBusinessMetric } from './business-metric';

export const BUSINESS_METRICS = {
  STOCK_RESERVATION: defineBusinessMetric<{ outcome: 'reserved' | 'insufficient' }>({
    name: 'stock.reservation',
    kind: 'counter',
    unit: '{reservation}',
    description: 'Comandos de reserva de estoque decididos, por resultado',
  }),
} as const;
