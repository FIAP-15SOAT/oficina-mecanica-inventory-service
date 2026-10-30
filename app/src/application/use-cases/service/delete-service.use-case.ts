import { IServiceRepository } from '@domain/interfaces/repositories/service.repository.interface';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';
import { ResourceConflictException } from '@application/exceptions/resource-conflict.exception';
import { inventoryCacheKeys } from '@application/keys/inventory-cache-keys';
import { ICache } from '@application/ports/output/cache.service.interface';
import { IQuoteItemUsageClient } from '@application/ports/output/quote-item-usage-client.interface';
import { IDeleteServiceUseCase } from '@application/ports/input/service/delete-service.use-case.interface';

export class DeleteServiceUseCase implements IDeleteServiceUseCase {
  constructor(
    private readonly serviceRepository: IServiceRepository,
    private readonly quoteItemUsage: IQuoteItemUsageClient,
    private readonly cache: ICache,
  ) {}

  async execute(id: string): Promise<void> {
    const service = await this.serviceRepository.findById(id);

    if (!service) {
      throw new ResourceNotFoundException('Serviço', id);
    }

    if (await this.quoteItemUsage.isServiceInUse(id)) {
      throw new ResourceConflictException(
        'Serviço não pode ser excluído pois está vinculado a ordens de serviço ou orçamentos.',
      );
    }

    await this.serviceRepository.delete(id);

    await this.cache.delete([inventoryCacheKeys.service(id)]);
  }
}
