import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { ConfigService } from '@nestjs/config';

import { IInternalHttpClient } from '@application/ports/output/internal-http-client.interface';
import { QuoteItemUsageClient } from '@infrastructure/clients/quote-item-usage.client';
import { ServiceIntegrationException } from '@infrastructure/exceptions/service-integration.exception';

const contract = JSON.parse(
  readFileSync(join(__dirname, '../../../contracts/quote-items.json'), 'utf8'),
) as { inUse: unknown; free: unknown; malformed: unknown };

const BASE_URL = 'http://work-order-service.work-order.svc.cluster.local:3000';

describe('QuoteItemUsageClient', () => {
  let http: jest.Mocked<IInternalHttpClient>;
  let client: QuoteItemUsageClient;

  const build = (url: string = BASE_URL): QuoteItemUsageClient =>
    new QuoteItemUsageClient(http, new ConfigService({ QUOTE_ITEMS_SERVICE_URL: url }));

  beforeEach(() => {
    http = { request: jest.fn() };
    client = build();
  });

  it('should fail to build when QUOTE_ITEMS_SERVICE_URL is missing', () => {
    expect(() => new QuoteItemUsageClient(http, new ConfigService({}))).toThrow(
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

    it('should propagate the integration failure', async () => {
      http.request.mockRejectedValue(new ServiceIntegrationException('down'));

      await expect(client.isServiceInUse('svc-1')).rejects.toBeInstanceOf(
        ServiceIntegrationException,
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
    ])('should fail with ServiceIntegrationException on %s', async (_label, body) => {
      http.request.mockResolvedValue(body);

      await expect(client.isServiceInUse('svc-1')).rejects.toBeInstanceOf(
        ServiceIntegrationException,
      );
      await expect(client.isPartSupplyInUse('part-1')).rejects.toBeInstanceOf(
        ServiceIntegrationException,
      );
    });
  });
});
