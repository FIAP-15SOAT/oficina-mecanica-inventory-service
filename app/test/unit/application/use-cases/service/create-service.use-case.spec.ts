import { ResourceConflictException } from '@application/exceptions/resource-conflict.exception';
import { CreateServiceUseCase } from '@application/use-cases/service/create-service.use-case';
import { CreateServiceDto } from '@application/ports/input/service/dto/create-service.dto';
import { IServiceRepository } from '@domain/interfaces/repositories/service.repository.interface';
import {
  createMockService,
  createMockServiceRepository,
} from '../../../../helpers/service-mock.factory';

describe('CreateServiceUseCase', () => {
  let useCase: CreateServiceUseCase;
  let serviceRepository: jest.Mocked<IServiceRepository>;

  beforeEach(() => {
    serviceRepository = createMockServiceRepository();
    useCase = new CreateServiceUseCase(serviceRepository);
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
  });
});
