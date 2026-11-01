import { Service } from '@domain/entities/service.entity';
import { IServiceRepository } from '@domain/interfaces/repositories/service.repository.interface';
import { CreateServiceDto } from '@application/ports/input/service/dto/create-service.dto';
import { ResourceConflictException } from '@application/exceptions/resource-conflict.exception';

export class CreateServiceUseCase {
  constructor(private readonly serviceRepository: IServiceRepository) {}

  async execute(createServiceDto: CreateServiceDto): Promise<Service> {
    const existingService = await this.serviceRepository.findByName(createServiceDto.name);

    if (existingService) {
      throw new ResourceConflictException('Serviço já cadastrado');
    }

    return await this.serviceRepository.create(
      Service.create({
        name: createServiceDto.name,
        description: createServiceDto.description,
        basePrice: createServiceDto.basePrice,
        estimatedTimeMin: createServiceDto.estimatedTimeMin,
      }),
    );
  }
}
