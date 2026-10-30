import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { ServiceRequestRejectedException } from '@application/exceptions/service-request-rejected.exception';
import { IInternalHttpClient } from '@application/ports/output/internal-http-client.interface';
import { IQuoteItemUsageClient } from '@application/ports/output/quote-item-usage-client.interface';
import { ILogger } from '@application/ports/output/logger.service.interface';
import { ServiceIntegrationException } from '@infrastructure/exceptions/service-integration.exception';
import { TECHNICAL_EVENTS } from '@infrastructure/logging/technical-event.catalog';

const USAGE_CHECK_UNAVAILABLE_MESSAGE =
  'Não foi possível confirmar se o item é usado em orçamentos; nada foi excluído, tente novamente mais tarde';

@Injectable()
export class QuoteItemUsageClient implements IQuoteItemUsageClient {
  private readonly baseUrl: string;

  constructor(
    @Inject('IInternalHttpClient') private readonly http: IInternalHttpClient,
    config: ConfigService,
    @Inject('ILogger') private readonly logger: ILogger,
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
      throw new ServiceIntegrationException(USAGE_CHECK_UNAVAILABLE_MESSAGE);
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
      // Whatever the outcome, the delete must not go ahead; only the log tells "route missing" from "owner down".
      if (error instanceof ServiceRequestRejectedException) {
        this.logger.event(
          TECHNICAL_EVENTS.QUOTE_ITEM_USAGE_REJECTED,
          { ownerStatusCode: error.statusCode },
          error,
        );
      }

      throw new ServiceIntegrationException(USAGE_CHECK_UNAVAILABLE_MESSAGE);
    }
  }
}
