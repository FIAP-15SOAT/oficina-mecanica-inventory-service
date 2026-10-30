import { Service } from '@domain/entities/service.entity';
import { IServiceRepository } from '@domain/interfaces/repositories/service.repository.interface';
import { UpdateServiceDto } from '@application/ports/input/service/dto/update-service.dto';

import { inventoryCacheKeys } from '@application/keys/inventory-cache-keys';
import { ICache } from '@application/ports/output/cache.service.interface';
import { ResourceConflictException } from '@application/exceptions/resource-conflict.exception';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';

export class UpdateServiceUseCase {
  constructor(
    private readonly serviceRepository: IServiceRepository,
    private readonly cache: ICache,
  ) {}

  async execute(id: string, updateServiceDto: UpdateServiceDto): Promise<Service> {
    const service = await this.serviceRepository.findById(id);

    if (!service) {
      throw new ResourceNotFoundException('Serviço', id);
    }

    const existingServiceWithName = await this.serviceRepository.findByName(updateServiceDto.name);

    if (existingServiceWithName && existingServiceWithName.id !== id) {
      throw new ResourceConflictException('Outro serviço com o mesmo nome já existe');
    }

    service.update({
      name: updateServiceDto.name,
      description: updateServiceDto.description,
      basePrice: updateServiceDto.basePrice,
      estimatedTimeMin: updateServiceDto.estimatedTimeMin,
    });

    const updated = await this.serviceRepository.update(service);

    await this.cache.delete([inventoryCacheKeys.service(updated.id)]);

    return updated;
  }
}
