import { Global, Module } from '@nestjs/common';

import { QuoteUsageGateway } from './quotes/quote-usage.gateway';

@Global()
@Module({
  providers: [{ provide: 'IQuoteUsageGateway', useClass: QuoteUsageGateway }],
  exports: ['IQuoteUsageGateway'],
})
export class GatewaysModule {}
