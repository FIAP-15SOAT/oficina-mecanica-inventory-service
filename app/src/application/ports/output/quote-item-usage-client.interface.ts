// Asks the owner of the quotes (currently the work-order) whether a catalog item is quoted.
export interface IQuoteItemUsageClient {
  isServiceInUse(serviceId: string): Promise<boolean>;
  isPartSupplyInUse(partSupplyId: string): Promise<boolean>;
}
