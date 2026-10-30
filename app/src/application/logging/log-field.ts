export type LogicalFieldName =
  | 'workOrderId'
  | 'partSupplyId'
  | 'partSupplyName'
  | 'movementType'
  | 'movementQuantity'
  | 'currentQuantity'
  | 'quoteId'
  | 'reservedItemCount'
  | 'reservedQuantity'
  | 'missingItemCount'
  | 'consumedItemCount'
  | 'port'
  | 'signal'
  | 'dependencyName'
  | 'healthFailureCategory'
  | 'healthDegradedDurationMs';

export type LogFields = Partial<Record<LogicalFieldName, unknown>>;
