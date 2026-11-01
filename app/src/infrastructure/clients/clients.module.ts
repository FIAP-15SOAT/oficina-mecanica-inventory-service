import { HttpModule } from '@nestjs/axios';
import { Global, Module } from '@nestjs/common';

import { InternalHttpClient } from './internal-http-client';
import { QuoteItemUsageClient } from './quote-item-usage.client';

@Global()
@Module({
  imports: [HttpModule],
  providers: [
    InternalHttpClient,
    { provide: 'IQuoteItemUsageClient', useClass: QuoteItemUsageClient },
  ],
  exports: [InternalHttpClient, 'IQuoteItemUsageClient'],
})
export class ClientsModule {}
