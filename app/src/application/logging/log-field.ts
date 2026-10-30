export type LogicalFieldName =
  | 'workOrderId'
  | 'partSupplyId'
  | 'partSupplyName'
  | 'movementType'
  | 'movementQuantity'
  | 'currentQuantity'
  | 'port'
  | 'signal'
  | 'dependencyName'
  | 'healthFailureCategory'
  | 'healthDegradedDurationMs';

export type LogFields = Partial<Record<LogicalFieldName, unknown>>;
