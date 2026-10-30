import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { ServiceRequestRejectedException } from '@application/exceptions/service-request-rejected.exception';
import { IInternalHttpClient } from '@application/ports/output/internal-http-client.interface';
import { IQuoteItemUsageClient } from '@application/ports/output/quote-item-usage-client.interface';
import { ServiceIntegrationException } from '@infrastructure/exceptions/service-integration.exception';

const MALFORMED_MESSAGE = 'Serviço de destino indisponível';

@Injectable()
export class QuoteItemUsageClient implements IQuoteItemUsageClient {
  private readonly baseUrl: string;

  constructor(
    @Inject('IInternalHttpClient') private readonly http: IInternalHttpClient,
    config: ConfigService,
  ) {
    this.baseUrl = config.getOrThrow<string>('QUOTE_ITEMS_SERVICE_URL').replace(/\/+$/, '');
  }

  isServiceInUse(serviceId: string): Promise<boolean> {
    return this.hasQuoteItems(`/internal/services/${serviceId}/quote-items`);
  }

  isPartSupplyInUse(partSupplyId: string): Promise<boolean> {
    return this.hasQuoteItems(`/internal/parts-supplies/${partSupplyId}/quote-items`);
  }

  private async hasQuoteItems(path: string): Promise<boolean> {
    const body = await this.fetchBody(path);

    // A malformed answer must never read as "not in use": the delete would go ahead.
    const items = (body as { data?: unknown } | null)?.data;

    if (!Array.isArray(items)) {
      throw new ServiceIntegrationException(MALFORMED_MESSAGE);
    }

    return items.length > 0;
  }

  private async fetchBody(path: string): Promise<unknown> {
    try {
      return await this.http.request<unknown>({
        method: 'GET',
        url: `${this.baseUrl}${path}`,
      });
    } catch (error) {
      // A 4xx from the owner (e.g. route not exposed yet) is not the caller's fault: report unavailability.
      if (error instanceof ServiceRequestRejectedException) {
        throw new ServiceIntegrationException(MALFORMED_MESSAGE);
      }
      throw error;
    }
  }
}
