import { DeleteServiceUseCase } from '@application/use-cases/service/delete-service.use-case';
import { ResourceConflictException } from '@application/exceptions/resource-conflict.exception';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';
import { ServiceRequestRejectedException } from '@application/exceptions/service-request-rejected.exception';
import { inventoryCacheKeys } from '@application/keys/inventory-cache-keys';
import { ICache } from '@application/ports/output/services/cache.service.interface';
import { IQuoteUsageGateway } from '@application/ports/output/gateways/quotes/quote-usage-gateway.interface';
import { IServiceRepository } from '@domain/interfaces/repositories/service.repository.interface';
import { ServiceIntegrationException } from '@infrastructure/exceptions/service-integration.exception';

import { createMockCache } from '../../../../helpers/cache-mock.factory';
import {
  createMockService,
  createMockServiceRepository,
} from '../../../../helpers/service-mock.factory';

describe('DeleteServiceUseCase', () => {
  let useCase: DeleteServiceUseCase;
  let serviceRepository: jest.Mocked<IServiceRepository>;
  let quoteUsage: jest.Mocked<IQuoteUsageGateway>;
  let cache: jest.Mocked<ICache>;

  beforeEach(() => {
    serviceRepository = createMockServiceRepository();
    quoteUsage = { isServiceInUse: jest.fn(), isPartSupplyInUse: jest.fn() };
    cache = createMockCache();
    useCase = new DeleteServiceUseCase(serviceRepository, quoteUsage, cache);
  });

  it('should delete the service and then drop its cache key when it is not in use', async () => {
    serviceRepository.findById.mockResolvedValue(createMockService({ id: 'svc-1' }));
    quoteUsage.isServiceInUse.mockResolvedValue(false);

    await useCase.execute('svc-1');

    expect(quoteUsage.isServiceInUse).toHaveBeenCalledWith('svc-1');
    expect(serviceRepository.delete).toHaveBeenCalledWith('svc-1');
    expect(cache.delete).toHaveBeenCalledWith([inventoryCacheKeys.service('svc-1')]);
    expect(cache.delete.mock.invocationCallOrder[0]).toBeGreaterThan(
      serviceRepository.delete.mock.invocationCallOrder[0],
    );
  });

  it('should throw ResourceNotFoundException without asking the owner when the service is missing', async () => {
    serviceRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute('svc-1')).rejects.toBeInstanceOf(ResourceNotFoundException);
    expect(quoteUsage.isServiceInUse).not.toHaveBeenCalled();
    expect(serviceRepository.delete).not.toHaveBeenCalled();
  });

  it('should throw ResourceConflictException when the service is linked to quotes', async () => {
    serviceRepository.findById.mockResolvedValue(createMockService({ id: 'svc-1' }));
    quoteUsage.isServiceInUse.mockResolvedValue(true);

    await expect(useCase.execute('svc-1')).rejects.toThrow(
      new ResourceConflictException(
        'Serviço não pode ser excluído pois está vinculado a ordens de serviço ou orçamentos',
      ),
    );
    expect(serviceRepository.delete).not.toHaveBeenCalled();
    expect(cache.delete).not.toHaveBeenCalled();
  });

  it.each([
    ['unavailable owner', new ServiceIntegrationException('down')],
    ['owner rejection', new ServiceRequestRejectedException(404, 'not found')],
  ])('should propagate %s and delete nothing', async (_label, error) => {
    serviceRepository.findById.mockResolvedValue(createMockService({ id: 'svc-1' }));
    quoteUsage.isServiceInUse.mockRejectedValue(error);

    await expect(useCase.execute('svc-1')).rejects.toBe(error);
    expect(serviceRepository.delete).not.toHaveBeenCalled();
    expect(cache.delete).not.toHaveBeenCalled();
  });

  it('should keep the cache key when the delete fails', async () => {
    serviceRepository.findById.mockResolvedValue(createMockService({ id: 'svc-1' }));
    quoteUsage.isServiceInUse.mockResolvedValue(false);
    serviceRepository.delete.mockRejectedValue(new Error('db down'));

    await expect(useCase.execute('svc-1')).rejects.toThrow('db down');
    expect(cache.delete).not.toHaveBeenCalled();
  });
});
