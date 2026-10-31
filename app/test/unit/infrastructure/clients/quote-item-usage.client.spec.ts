import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { ConfigService } from '@nestjs/config';

import { ILogger } from '@application/ports/output/logger.service.interface';
import { IInternalHttpClient } from '@application/ports/output/internal-http-client.interface';
import { ServiceRequestRejectedException } from '@application/exceptions/service-request-rejected.exception';
import { QuoteItemUsageClient } from '@infrastructure/clients/quote-item-usage.client';
import { ServiceIntegrationException } from '@infrastructure/exceptions/service-integration.exception';
import { TECHNICAL_EVENTS } from '@infrastructure/logging/technical-event.catalog';

import { createMockLogger } from '../../../helpers/logger-mock.factory';

const contract = JSON.parse(
  readFileSync(join(__dirname, '../../../contracts/quote-items.json'), 'utf8'),
) as { inUse: unknown; free: unknown; malformed: unknown };

const BASE_URL = 'http://work-order-service.work-order.svc.cluster.local:3000';
const UNAVAILABLE_MESSAGE =
  'Não foi possível confirmar se o item é usado em orçamentos; nada foi excluído, tente novamente mais tarde';

describe('QuoteItemUsageClient', () => {
  let http: jest.Mocked<IInternalHttpClient>;
  let logger: jest.Mocked<ILogger>;
  let client: QuoteItemUsageClient;

  const build = (url: string = BASE_URL): QuoteItemUsageClient =>
    new QuoteItemUsageClient(http, new ConfigService({ QUOTE_ITEMS_SERVICE_URL: url }), logger);

  beforeEach(() => {
    http = { request: jest.fn() };
    logger = createMockLogger();
    client = build();
  });

  it('should fail to build when QUOTE_ITEMS_SERVICE_URL is missing', () => {
    expect(() => new QuoteItemUsageClient(http, new ConfigService({}), logger)).toThrow(
      'QUOTE_ITEMS_SERVICE_URL',
    );
  });

  describe('isServiceInUse', () => {
    it('should call the owner with the default timeout and report in use for a non-empty list', async () => {
      http.request.mockResolvedValue(contract.inUse);

      await expect(client.isServiceInUse('svc-1')).resolves.toBe(true);
      expect(http.request).toHaveBeenCalledWith({
        method: 'GET',
        url: `${BASE_URL}/internal/services/svc-1/quote-items`,
      });
    });

    it('should report not in use for an empty list', async () => {
      http.request.mockResolvedValue(contract.free);

      await expect(client.isServiceInUse('svc-1')).resolves.toBe(false);
    });

    it('should not duplicate the slash when the base URL ends with one', async () => {
      http.request.mockResolvedValue(contract.free);

      await build(`${BASE_URL}/`).isServiceInUse('svc-1');

      expect(http.request).toHaveBeenCalledWith(
        expect.objectContaining({ url: `${BASE_URL}/internal/services/svc-1/quote-items` }),
      );
    });

    it('should report the specific message when the owner is down', async () => {
      http.request.mockRejectedValue(new ServiceIntegrationException('down'));

      await expect(client.isServiceInUse('svc-1')).rejects.toThrow(
        new ServiceIntegrationException(UNAVAILABLE_MESSAGE),
      );
      expect(logger.event).not.toHaveBeenCalled();
    });
  });

  describe('4xx from the owner', () => {
    it('should translate the rejection into ServiceIntegrationException and log the owner status', async () => {
      const rejection = new ServiceRequestRejectedException(404, 'Rota não encontrada');
      http.request.mockRejectedValue(rejection);

      await expect(client.isServiceInUse('svc-1')).rejects.toThrow(
        new ServiceIntegrationException(UNAVAILABLE_MESSAGE),
      );
      await expect(client.isPartSupplyInUse('part-1')).rejects.toBeInstanceOf(
        ServiceIntegrationException,
      );
      expect(logger.event).toHaveBeenCalledTimes(2);
      expect(logger.event).toHaveBeenCalledWith(
        TECHNICAL_EVENTS.QUOTE_ITEM_USAGE_REJECTED,
        { ownerStatusCode: 404 },
        rejection,
      );
    });
  });

  describe('isPartSupplyInUse', () => {
    it('should call the owner with the default timeout and report in use for a non-empty list', async () => {
      http.request.mockResolvedValue(contract.inUse);

      await expect(client.isPartSupplyInUse('part-1')).resolves.toBe(true);
      expect(http.request).toHaveBeenCalledWith({
        method: 'GET',
        url: `${BASE_URL}/internal/parts-supplies/part-1/quote-items`,
      });
    });

    it('should report not in use for an empty list', async () => {
      http.request.mockResolvedValue(contract.free);

      await expect(client.isPartSupplyInUse('part-1')).resolves.toBe(false);
    });
  });

  describe('malformed owner body', () => {
    it.each([
      ['fixture', contract.malformed],
      ['null data', { data: null }],
      ['object data', { data: {} }],
      ['string data', { data: 'x' }],
      ['numeric data', { data: 0 }],
      ['null body', null],
      ['string body', '<html></html>'],
    ])('should fail with the specific message on %s', async (_label, body) => {
      http.request.mockResolvedValue(body);

      await expect(client.isServiceInUse('svc-1')).rejects.toThrow(
        new ServiceIntegrationException(UNAVAILABLE_MESSAGE),
      );
      await expect(client.isPartSupplyInUse('part-1')).rejects.toThrow(
        new ServiceIntegrationException(UNAVAILABLE_MESSAGE),
      );
    });
  });
});
