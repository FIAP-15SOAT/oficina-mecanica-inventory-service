import { ResourceConflictException } from '@application/exceptions/resource-conflict.exception';
import { CreateServiceUseCase } from '@application/use-cases/service/create-service.use-case';
import { CreateServiceDto } from '@application/ports/input/service/dto/create-service.dto';
import { inventoryCacheKeys } from '@application/keys/inventory-cache-keys';
import { ICache } from '@application/ports/output/cache.service.interface';
import { IServiceRepository } from '@domain/interfaces/repositories/service.repository.interface';
import { createMockCache } from '../../../../helpers/cache-mock.factory';
import {
  createMockService,
  createMockServiceRepository,
} from '../../../../helpers/service-mock.factory';

describe('CreateServiceUseCase', () => {
  let useCase: CreateServiceUseCase;
  let serviceRepository: jest.Mocked<IServiceRepository>;
  let cache: jest.Mocked<ICache>;

  beforeEach(() => {
    serviceRepository = createMockServiceRepository();
    cache = createMockCache();
    useCase = new CreateServiceUseCase(serviceRepository, cache);
  });

  it('should create a service successfully', async () => {
    const input: CreateServiceDto = {
      name: 'Oil Change',
      description: 'Full engine oil change',
      basePrice: 99.99,
      estimatedTimeMin: 30,
    };

    const createdService = createMockService({
      name: input.name,
      description: input.description,
      basePrice: input.basePrice,
      estimatedTimeMin: input.estimatedTimeMin,
    });

    serviceRepository.findByName.mockResolvedValue(null);
    serviceRepository.create.mockResolvedValue(createdService);

    const result = await useCase.execute(input);

    expect(result).toEqual(createdService);
    expect(serviceRepository.create).toHaveBeenCalledTimes(1);
    expect(cache.delete).toHaveBeenCalledWith([inventoryCacheKeys.service(createdService.id)]);
    expect(cache.delete.mock.invocationCallOrder[0]).toBeGreaterThan(
      serviceRepository.create.mock.invocationCallOrder[0],
    );
  });

  it('should not touch the cache when the repository fails', async () => {
    serviceRepository.findByName.mockResolvedValue(null);
    serviceRepository.create.mockRejectedValue(new Error('db down'));

    await expect(
      useCase.execute({ name: 'Oil Change', basePrice: 99.99, estimatedTimeMin: 30 }),
    ).rejects.toThrow('db down');

    expect(cache.delete).not.toHaveBeenCalled();
  });

  it('should throw ResourceConflictException when service name already exists', async () => {
    serviceRepository.findByName.mockResolvedValue(createMockService());

    await expect(
      useCase.execute({
        name: 'Oil Change',
        basePrice: 99.99,
        estimatedTimeMin: 30,
      }),
    ).rejects.toThrow(ResourceConflictException);

    expect(serviceRepository.create).not.toHaveBeenCalled();
    expect(cache.delete).not.toHaveBeenCalled();
  });
});
