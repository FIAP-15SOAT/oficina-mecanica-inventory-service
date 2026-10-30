import { UpdatePartSupplyUseCase } from '@application/use-cases/part-supply/update-part-supply.use-case';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';
import { ResourceConflictException } from '@application/exceptions/resource-conflict.exception';
import { PartSupplyCategory } from '@domain/enums/part-supply-category.enum';
import { Unit } from '@domain/enums/unit.enum';
import { inventoryCacheKeys } from '@application/keys/inventory-cache-keys';
import { ICache } from '@application/ports/output/cache.service.interface';
import { IPartSupplyRepository } from '@domain/interfaces/repositories/part-supply.repository.interface';
import { UpdatePartSupplyDto } from '@application/ports/input/part-supply/dto/update-part-supply.dto';
import { createMockCache } from '../../../../helpers/cache-mock.factory';
import {
  createMockPartSupply,
  createMockPartSupplyRepository,
} from '../../../../helpers/part-supply-mock.factory';

describe('UpdatePartSupplyUseCase', () => {
  let useCase: UpdatePartSupplyUseCase;
  let partSupplyRepository: jest.Mocked<IPartSupplyRepository>;
  let cache: jest.Mocked<ICache>;

  const validInput: UpdatePartSupplyDto = {
    name: 'Filtro de Óleo',
    sku: 'FO-001',
    category: PartSupplyCategory.PART,
    unit: Unit.UN,
    costPrice: 25.0,
    salePrice: 45.0,
  };

  beforeEach(() => {
    partSupplyRepository = createMockPartSupplyRepository();
    cache = createMockCache();
    useCase = new UpdatePartSupplyUseCase(partSupplyRepository, cache);
  });

  it('should update a Part or Supply successfully', async () => {
    const existing = createMockPartSupply({ id: 'uuid-1' });
    const updated = createMockPartSupply({ id: 'uuid-1', salePrice: 50 });
    partSupplyRepository.findById.mockResolvedValue(existing);
    partSupplyRepository.update.mockResolvedValue(updated);

    const result = await useCase.execute('uuid-1', { ...validInput, salePrice: 50 });

    expect(result).toEqual(updated);
    expect(partSupplyRepository.update).toHaveBeenCalledWith(
      expect.objectContaining({ salePrice: 50 }),
    );
    expect(cache.delete).toHaveBeenCalledWith([inventoryCacheKeys.partSupply('uuid-1')]);
    expect(cache.delete.mock.invocationCallOrder[0]).toBeGreaterThan(
      partSupplyRepository.update.mock.invocationCallOrder[0],
    );
  });

  it('should throw ResourceNotFoundException when item does not exist in Stock', async () => {
    partSupplyRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute('uuid-999', validInput)).rejects.toThrow(
      ResourceNotFoundException,
    );
  });

  it('should throw ResourceConflictException when updating SKU to one already in use', async () => {
    const existing = createMockPartSupply({ id: 'uuid-1', sku: 'FO-001' });
    const other = createMockPartSupply({ id: 'uuid-2', sku: 'FO-002' });
    partSupplyRepository.findById.mockResolvedValue(existing);
    partSupplyRepository.findBySku.mockResolvedValue(other);

    await expect(useCase.execute('uuid-1', { ...validInput, sku: 'FO-002' })).rejects.toThrow(
      ResourceConflictException,
    );
    expect(partSupplyRepository.update).not.toHaveBeenCalled();
    expect(cache.delete).not.toHaveBeenCalled();
  });

  it('should not touch the cache when the repository fails', async () => {
    partSupplyRepository.findById.mockResolvedValue(createMockPartSupply({ id: 'uuid-1' }));
    partSupplyRepository.update.mockRejectedValue(new Error('db down'));

    await expect(useCase.execute('uuid-1', validInput)).rejects.toThrow('db down');

    expect(cache.delete).not.toHaveBeenCalled();
  });

  it('should update when new SKU is not already in use', async () => {
    const existing = createMockPartSupply({ id: 'uuid-1', sku: 'FO-001' });
    const updated = createMockPartSupply({ id: 'uuid-1', sku: 'FO-NEW' });
    partSupplyRepository.findById.mockResolvedValue(existing);
    partSupplyRepository.findBySku.mockResolvedValue(null);
    partSupplyRepository.update.mockResolvedValue(updated);

    const result = await useCase.execute('uuid-1', { ...validInput, sku: 'FO-NEW' });

    expect(result).toEqual(updated);
    expect(partSupplyRepository.findBySku).toHaveBeenCalledWith('FO-NEW');
    expect(partSupplyRepository.update).toHaveBeenCalledWith(
      expect.objectContaining({ sku: 'FO-NEW' }),
    );
  });
});
