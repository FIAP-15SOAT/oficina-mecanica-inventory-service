import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { ServiceRequestRejectedException } from '@application/exceptions/service-request-rejected.exception';
import { IQuoteUsageGateway } from '@application/ports/output/gateways/quotes/quote-usage-gateway.interface';
import { ILogger } from '@application/ports/output/services/logger.service.interface';
import { InternalHttpClient } from '@infrastructure/clients/internal-http-client';
import { ServiceIntegrationException } from '@infrastructure/exceptions/service-integration.exception';
import { TECHNICAL_EVENTS } from '@infrastructure/logging/technical-event.catalog';

const USAGE_CHECK_UNAVAILABLE_MESSAGE =
  'Não foi possível confirmar se o item é usado em orçamentos; nada foi excluído, tente novamente mais tarde';

@Injectable()
export class QuoteUsageGateway implements IQuoteUsageGateway {
  private readonly baseUrl: string;

  constructor(
    private readonly http: InternalHttpClient,
    config: ConfigService,
    @Inject('ILogger') private readonly logger: ILogger,
  ) {
    this.baseUrl = config.getOrThrow<string>('QUOTE_ITEMS_SERVICE_URL').replace(/\/+$/, '');
  }

  isServiceInUse(serviceId: string): Promise<boolean> {
    return this.readInUse(`/internal/services/${serviceId}/quote-usage`);
  }

  isPartSupplyInUse(partSupplyId: string): Promise<boolean> {
    return this.readInUse(`/internal/parts-supplies/${partSupplyId}/quote-usage`);
  }

  private async readInUse(path: string): Promise<boolean> {
    const body = await this.fetchBody(path);

    // A malformed answer must never read as "not in use": the delete would go ahead.
    const inUse = (body as { data?: { inUse?: unknown } | null } | null)?.data?.inUse;

    if (typeof inUse !== 'boolean') {
      throw new ServiceIntegrationException(USAGE_CHECK_UNAVAILABLE_MESSAGE);
    }

    return inUse;
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
          TECHNICAL_EVENTS.QUOTE_USAGE_REJECTED,
          { ownerStatusCode: error.statusCode },
          error,
        );
      }

      throw new ServiceIntegrationException(USAGE_CHECK_UNAVAILABLE_MESSAGE);
    }
  }
}
