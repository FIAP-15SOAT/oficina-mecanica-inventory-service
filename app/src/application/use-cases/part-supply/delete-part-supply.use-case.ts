import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';
import { ResourceConflictException } from '@application/exceptions/resource-conflict.exception';
import { IPartSupplyRepository } from '@domain/interfaces/repositories/part-supply.repository.interface';
import { inventoryCacheKeys } from '@application/keys/inventory-cache-keys';
import { ICache } from '@application/ports/output/cache.service.interface';
import { IQuoteItemUsageClient } from '@application/ports/output/quote-item-usage-client.interface';
import { IDeletePartSupplyUseCase } from '@application/ports/input/part-supply/delete-part-supply.use-case.interface';

export class DeletePartSupplyUseCase implements IDeletePartSupplyUseCase {
  constructor(
    private readonly partSupplyRepository: IPartSupplyRepository,
    private readonly quoteItemUsage: IQuoteItemUsageClient,
    private readonly cache: ICache,
  ) {}

  async execute(id: string): Promise<void> {
    const existing = await this.partSupplyRepository.findById(id);

    if (!existing) {
      throw new ResourceNotFoundException('Peça ou Insumo', id);
    }

    existing.ensureCanDelete();

    if (await this.quoteItemUsage.isPartSupplyInUse(id)) {
      throw new ResourceConflictException(
        'Peça ou insumo não pode ser excluído pois está vinculado a ordens de serviço ou orçamentos',
      );
    }

    await this.partSupplyRepository.delete(id);

    await this.cache.delete([inventoryCacheKeys.partSupply(id)]);
  }
}
