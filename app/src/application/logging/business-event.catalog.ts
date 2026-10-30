import { defineLogEvent } from './log-event';

export const BUSINESS_EVENTS = {
  STOCK_UPDATED: defineLogEvent<{
    partSupplyId: string;
    partSupplyName: string;
    movementType: string;
    movementQuantity: number;
    currentQuantity: number;
    workOrderId?: string;
  }>({
    name: 'stock.updated',
    message: 'stock movement applied to a part or supply',
    level: 'info',
  }),
};
