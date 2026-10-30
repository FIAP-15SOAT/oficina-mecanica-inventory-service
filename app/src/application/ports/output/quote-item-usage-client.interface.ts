// Asks the owner of the quotes (work-order until C-23, Billing after) whether a catalog item is quoted.
export interface IQuoteItemUsageClient {
  isServiceInUse(serviceId: string): Promise<boolean>;
  isPartSupplyInUse(partSupplyId: string): Promise<boolean>;
}
