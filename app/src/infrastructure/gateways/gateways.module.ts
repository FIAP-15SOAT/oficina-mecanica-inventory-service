import { Global, Module } from '@nestjs/common';

import { HttpBillingQuoteUsageGateway } from './billing/http-billing-quote-usage-gateway';

@Global()
@Module({
  providers: [{ provide: 'IBillingQuoteUsageGateway', useClass: HttpBillingQuoteUsageGateway }],
  exports: ['IBillingQuoteUsageGateway'],
})
export class GatewaysModule {}
