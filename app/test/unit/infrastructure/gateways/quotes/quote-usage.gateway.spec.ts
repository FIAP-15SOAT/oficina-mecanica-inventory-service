import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { ConfigService } from '@nestjs/config';

import { ILogger } from '@application/ports/output/services/logger.service.interface';
import { ServiceRequestRejectedException } from '@application/exceptions/service-request-rejected.exception';
import { InternalHttpClient } from '@infrastructure/clients/internal-http-client';
import { ServiceIntegrationException } from '@infrastructure/exceptions/service-integration.exception';
import { QuoteUsageGateway } from '@infrastructure/gateways/quotes/quote-usage.gateway';
import { TECHNICAL_EVENTS } from '@infrastructure/logging/technical-event.catalog';

import { createMockLogger } from '../../../../helpers/logger-mock.factory';

const contract = JSON.parse(
  readFileSync(join(__dirname, '../../../../contracts/quote-usage.json'), 'utf8'),
) as { inUse: unknown; free: unknown; malformed: unknown };

const BASE_URL = 'http://work-order-service.work-order.svc.cluster.local:3000';
const UNAVAILABLE_MESSAGE =
  'Não foi possível confirmar se o item é usado em orçamentos; nada foi excluído, tente novamente mais tarde';

describe('QuoteUsageGateway', () => {
  let internalHttpClient: jest.Mocked<InternalHttpClient>;
  let logger: jest.Mocked<ILogger>;
  let gateway: QuoteUsageGateway;

  beforeEach(() => {
    internalHttpClient = { request: jest.fn() } as unknown as jest.Mocked<InternalHttpClient>;
    logger = createMockLogger();
    gateway = new QuoteUsageGateway(
      internalHttpClient,
      new ConfigService({ QUOTE_ITEMS_SERVICE_URL: BASE_URL }),
      logger,
    );
  });

  it('should fail to build when QUOTE_ITEMS_SERVICE_URL is missing', () => {
    expect(() => new QuoteUsageGateway(internalHttpClient, new ConfigService({}), logger)).toThrow(
      'QUOTE_ITEMS_SERVICE_URL',
    );
  });

  describe('isServiceInUse', () => {
    it('should call the owner with the default timeout and return true when inUse is true', async () => {
      internalHttpClient.request.mockResolvedValue(contract.inUse);

      await expect(gateway.isServiceInUse('svc-1')).resolves.toBe(true);
      expect(internalHttpClient.request).toHaveBeenCalledWith({
        method: 'GET',
        url: `${BASE_URL}/internal/services/svc-1/quote-usage`,
      });
    });

    it('should return false when inUse is false', async () => {
      internalHttpClient.request.mockResolvedValue(contract.free);

      await expect(gateway.isServiceInUse('svc-1')).resolves.toBe(false);
    });

    it('should not duplicate the slash when the base URL ends with one', async () => {
      internalHttpClient.request.mockResolvedValue(contract.free);
      gateway = new QuoteUsageGateway(
        internalHttpClient,
        new ConfigService({ QUOTE_ITEMS_SERVICE_URL: `${BASE_URL}/` }),
        logger,
      );

      await gateway.isServiceInUse('svc-1');

      expect(internalHttpClient.request).toHaveBeenCalledWith(
        expect.objectContaining({ url: `${BASE_URL}/internal/services/svc-1/quote-usage` }),
      );
    });

    it('should report the specific message when the owner is down', async () => {
      internalHttpClient.request.mockRejectedValue(new ServiceIntegrationException('down'));

      await expect(gateway.isServiceInUse('svc-1')).rejects.toThrow(
        new ServiceIntegrationException(UNAVAILABLE_MESSAGE),
      );
      expect(logger.event).not.toHaveBeenCalled();
    });
  });

  describe('isPartSupplyInUse', () => {
    it('should call the owner with the default timeout and return true when inUse is true', async () => {
      internalHttpClient.request.mockResolvedValue(contract.inUse);

      await expect(gateway.isPartSupplyInUse('part-1')).resolves.toBe(true);
      expect(internalHttpClient.request).toHaveBeenCalledWith({
        method: 'GET',
        url: `${BASE_URL}/internal/parts-supplies/part-1/quote-usage`,
      });
    });

    it('should return false when inUse is false', async () => {
      internalHttpClient.request.mockResolvedValue(contract.free);

      await expect(gateway.isPartSupplyInUse('part-1')).resolves.toBe(false);
    });
  });

  describe('4xx from the owner', () => {
    it('should translate the rejection into ServiceIntegrationException and log the owner status', async () => {
      const rejection = new ServiceRequestRejectedException(404, 'Rota não encontrada');
      internalHttpClient.request.mockRejectedValue(rejection);

      await expect(gateway.isServiceInUse('svc-1')).rejects.toThrow(
        new ServiceIntegrationException(UNAVAILABLE_MESSAGE),
      );
      await expect(gateway.isPartSupplyInUse('part-1')).rejects.toBeInstanceOf(
        ServiceIntegrationException,
      );
      expect(logger.event).toHaveBeenCalledTimes(2);
      expect(logger.event).toHaveBeenCalledWith(
        TECHNICAL_EVENTS.QUOTE_USAGE_REJECTED,
        { ownerStatusCode: 404 },
        rejection,
      );
    });
  });

  describe('owner body without a boolean data.inUse', () => {
    it.each([
      ['fixture', contract.malformed],
      ['null data', { data: null }],
      ['string inUse', { data: { inUse: 'true' } }],
      ['numeric inUse', { data: { inUse: 1 } }],
      ['list data', { data: [] }],
      ['null body', null],
      ['string body', '<html></html>'],
    ])('should fail with the specific message on %s', async (_label, body) => {
      internalHttpClient.request.mockResolvedValue(body);

      await expect(gateway.isServiceInUse('svc-1')).rejects.toThrow(
        new ServiceIntegrationException(UNAVAILABLE_MESSAGE),
      );
      await expect(gateway.isPartSupplyInUse('part-1')).rejects.toThrow(
        new ServiceIntegrationException(UNAVAILABLE_MESSAGE),
      );
    });
  });
});
