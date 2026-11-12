import { DeletePartSupplyUseCase } from '@application/use-cases/part-supply/delete-part-supply.use-case';
import { BusinessRuleViolationException } from '@domain/exceptions/business-rule-violation.exception';
import { ResourceConflictException } from '@application/exceptions/resource-conflict.exception';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';
import { ServiceRequestRejectedException } from '@application/exceptions/service-request-rejected.exception';
import { inventoryCacheKeys } from '@application/keys/inventory-cache-keys';
import { ICache } from '@application/ports/output/services/cache.service.interface';
import { IBillingQuoteUsageGateway } from '@application/ports/output/gateways/billing/billing-quote-usage-gateway.interface';
import { IPartSupplyRepository } from '@domain/interfaces/repositories/part-supply.repository.interface';
import { ServiceIntegrationException } from '@infrastructure/exceptions/service-integration.exception';

import { createMockCache } from '../../../../helpers/cache-mock.factory';
import {
  createMockPartSupply,
  createMockPartSupplyRepository,
} from '../../../../helpers/part-supply-mock.factory';

describe('DeletePartSupplyUseCase', () => {
  let useCase: DeletePartSupplyUseCase;
  let partSupplyRepository: jest.Mocked<IPartSupplyRepository>;
  let billingQuoteUsageGateway: jest.Mocked<IBillingQuoteUsageGateway>;
  let cache: jest.Mocked<ICache>;

  beforeEach(() => {
    partSupplyRepository = createMockPartSupplyRepository();
    billingQuoteUsageGateway = { isServiceInUse: jest.fn(), isPartSupplyInUse: jest.fn() };
    cache = createMockCache();
    useCase = new DeletePartSupplyUseCase(partSupplyRepository, billingQuoteUsageGateway, cache);
  });

  it('should delete the part and then drop its cache key when it is not in use', async () => {
    partSupplyRepository.findById.mockResolvedValue(createMockPartSupply({ id: 'part-1' }));
    billingQuoteUsageGateway.isPartSupplyInUse.mockResolvedValue(false);

    await useCase.execute('part-1');

    expect(billingQuoteUsageGateway.isPartSupplyInUse).toHaveBeenCalledWith('part-1');
    expect(partSupplyRepository.delete).toHaveBeenCalledWith('part-1');
    expect(cache.delete).toHaveBeenCalledWith([inventoryCacheKeys.partSupply('part-1')]);
    expect(cache.delete.mock.invocationCallOrder[0]).toBeGreaterThan(
      partSupplyRepository.delete.mock.invocationCallOrder[0],
    );
  });

  it('should throw ResourceNotFoundException without asking the owner when the part is missing', async () => {
    partSupplyRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute('part-1')).rejects.toBeInstanceOf(ResourceNotFoundException);
    expect(billingQuoteUsageGateway.isPartSupplyInUse).not.toHaveBeenCalled();
  });

  it('should throw a business rule violation without asking the owner when stock is reserved', async () => {
    partSupplyRepository.findById.mockResolvedValue(
      createMockPartSupply({ id: 'part-1', stock: 10, reservedStock: 2 }),
    );

    await expect(useCase.execute('part-1')).rejects.toBeInstanceOf(BusinessRuleViolationException);
    expect(billingQuoteUsageGateway.isPartSupplyInUse).not.toHaveBeenCalled();
    expect(partSupplyRepository.delete).not.toHaveBeenCalled();
  });

  it('should throw ResourceConflictException when the part is linked to quotes', async () => {
    partSupplyRepository.findById.mockResolvedValue(createMockPartSupply({ id: 'part-1' }));
    billingQuoteUsageGateway.isPartSupplyInUse.mockResolvedValue(true);

    await expect(useCase.execute('part-1')).rejects.toThrow(
      new ResourceConflictException(
        'Peça ou insumo não pode ser excluído pois está vinculado a ordens de serviço ou orçamentos',
      ),
    );
    expect(partSupplyRepository.delete).not.toHaveBeenCalled();
    expect(cache.delete).not.toHaveBeenCalled();
  });

  it.each([
    ['unavailable owner', new ServiceIntegrationException('down')],
    ['owner rejection', new ServiceRequestRejectedException(404, 'not found')],
  ])('should propagate %s and delete nothing', async (_label, error) => {
    partSupplyRepository.findById.mockResolvedValue(createMockPartSupply({ id: 'part-1' }));
    billingQuoteUsageGateway.isPartSupplyInUse.mockRejectedValue(error);

    await expect(useCase.execute('part-1')).rejects.toBe(error);
    expect(partSupplyRepository.delete).not.toHaveBeenCalled();
    expect(cache.delete).not.toHaveBeenCalled();
  });

  it('should keep the cache key when the delete fails', async () => {
    partSupplyRepository.findById.mockResolvedValue(createMockPartSupply({ id: 'part-1' }));
    billingQuoteUsageGateway.isPartSupplyInUse.mockResolvedValue(false);
    partSupplyRepository.delete.mockRejectedValue(new Error('db down'));

    await expect(useCase.execute('part-1')).rejects.toThrow('db down');
    expect(cache.delete).not.toHaveBeenCalled();
  });
});
