import { Service } from '@domain/entities/service.entity';
import { IServiceRepository } from '@domain/interfaces/repositories/service.repository.interface';
import { CreateServiceDto } from '@application/ports/input/service/dto/create-service.dto';
import { ResourceConflictException } from '@application/exceptions/resource-conflict.exception';
import { inventoryCacheKeys } from '@application/keys/inventory-cache-keys';
import { ICache } from '@application/ports/output/cache.service.interface';

export class CreateServiceUseCase {
  constructor(
    private readonly serviceRepository: IServiceRepository,
    private readonly cache: ICache,
  ) {}

  async execute(createServiceDto: CreateServiceDto): Promise<Service> {
    const existingService = await this.serviceRepository.findByName(createServiceDto.name);

    if (existingService) {
      throw new ResourceConflictException('Serviço já cadastrado');
    }

    const created = await this.serviceRepository.create(
      Service.create({
        name: createServiceDto.name,
        description: createServiceDto.description,
        basePrice: createServiceDto.basePrice,
        estimatedTimeMin: createServiceDto.estimatedTimeMin,
      }),
    );

    await this.cache.delete([inventoryCacheKeys.service(created.id)]);

    return created;
  }
}
