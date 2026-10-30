import { ResourceConflictException } from '@application/exceptions/resource-conflict.exception';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';
import { UpdateServiceUseCase } from '@application/use-cases/service/update-service.use-case';
import { UpdateServiceDto } from '@application/ports/input/service/dto/update-service.dto';
import { inventoryCacheKeys } from '@application/keys/inventory-cache-keys';
import { ICache } from '@application/ports/output/cache.service.interface';
import { IServiceRepository } from '@domain/interfaces/repositories/service.repository.interface';
import { createMockCache } from '../../../../helpers/cache-mock.factory';
import {
  createMockService,
  createMockServiceRepository,
} from '../../../../helpers/service-mock.factory';

describe('UpdateServiceUseCase', () => {
  let useCase: UpdateServiceUseCase;
  let serviceRepository: jest.Mocked<IServiceRepository>;
  let cache: jest.Mocked<ICache>;

  beforeEach(() => {
    serviceRepository = createMockServiceRepository();
    cache = createMockCache();
    useCase = new UpdateServiceUseCase(serviceRepository, cache);
  });

  it('should update a service successfully', async () => {
    const input: UpdateServiceDto = {
      name: 'Full Oil Change',
      basePrice: 149.99,
      estimatedTimeMin: 45,
    };

    const existing = createMockService();

    const updated = createMockService({
      ...existing,
      name: input.name,
      basePrice: input.basePrice,
      estimatedTimeMin: input.estimatedTimeMin,
    });

    serviceRepository.findById.mockResolvedValue(existing);
    serviceRepository.findByName.mockResolvedValue(null);
    serviceRepository.update.mockResolvedValue(updated);

    const result = await useCase.execute(existing.id, input);

    expect(result).toEqual(updated);
    expect(serviceRepository.update).toHaveBeenCalledTimes(1);
    expect(cache.delete).toHaveBeenCalledWith([inventoryCacheKeys.service(existing.id)]);
    expect(cache.delete.mock.invocationCallOrder[0]).toBeGreaterThan(
      serviceRepository.update.mock.invocationCallOrder[0],
    );
  });

  it('should not touch the cache when the repository fails', async () => {
    const existing = createMockService();

    serviceRepository.findById.mockResolvedValue(existing);
    serviceRepository.findByName.mockResolvedValue(null);
    serviceRepository.update.mockRejectedValue(new Error('db down'));

    await expect(
      useCase.execute(existing.id, { name: 'Other', basePrice: 10, estimatedTimeMin: 5 }),
    ).rejects.toThrow('db down');

    expect(cache.delete).not.toHaveBeenCalled();
  });

  it('should allow renaming a service to its own current name', async () => {
    const input: UpdateServiceDto = {
      name: 'Oil Change',
      basePrice: 99.99,
      estimatedTimeMin: 30,
    };

    const existing = createMockService({ name: input.name });

    serviceRepository.findById.mockResolvedValue(existing);
    serviceRepository.findByName.mockResolvedValue(existing);
    serviceRepository.update.mockResolvedValue(existing);

    const result = await useCase.execute(existing.id, input);

    expect(result).toEqual(existing);
    expect(serviceRepository.update).toHaveBeenCalled();
  });

  it('should throw ResourceNotFoundException when service does not exist', async () => {
    const input: UpdateServiceDto = {
      name: 'Oil Change',
      basePrice: 99.99,
      estimatedTimeMin: 30,
    };

    serviceRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute('non-existent-id', input)).rejects.toThrow(
      ResourceNotFoundException,
    );

    expect(serviceRepository.update).not.toHaveBeenCalled();
    expect(cache.delete).not.toHaveBeenCalled();
  });

  it('should throw ResourceConflictException when another service already uses the new name', async () => {
    const input: UpdateServiceDto = {
      name: 'Tire Rotation',
      basePrice: 49.99,
      estimatedTimeMin: 20,
    };

    const existing = createMockService();
    const conflicting = createMockService({ name: input.name });

    serviceRepository.findById.mockResolvedValue(existing);
    serviceRepository.findByName.mockResolvedValue(conflicting);

    await expect(useCase.execute(existing.id, input)).rejects.toThrow(ResourceConflictException);

    expect(serviceRepository.update).not.toHaveBeenCalled();
    expect(cache.delete).not.toHaveBeenCalled();
  });
});
