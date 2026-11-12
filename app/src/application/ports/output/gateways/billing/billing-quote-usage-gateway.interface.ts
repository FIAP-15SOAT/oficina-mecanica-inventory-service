// Asks the owner of the quotes, set by QUOTE_ITEMS_SERVICE_URL, whether a catalog item is quoted.
export interface IBillingQuoteUsageGateway {
  isServiceInUse(serviceId: string): Promise<boolean>;
  isPartSupplyInUse(partSupplyId: string): Promise<boolean>;
}
