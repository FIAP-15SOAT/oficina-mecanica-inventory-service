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
  STOCK_RESERVED: defineLogEvent<{
    workOrderId: string;
    quoteId: string;
    reservedItemCount: number;
    reservedQuantity: number;
  }>({
    name: 'stock.reserved',
    message: 'stock reserved for the work order',
    level: 'info',
  }),
  STOCK_RESERVATION_FAILED: defineLogEvent<{
    workOrderId: string;
    quoteId: string;
    missingItemCount: number;
  }>({
    name: 'stock.reservation_failed',
    message: 'stock reservation refused for lack of available stock',
    level: 'info',
  }),
};
