import { ResourceConflictException } from '@application/exceptions/resource-conflict.exception';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';
import { PartSupply } from '@domain/entities/part-supply.entity';
import { IPartSupplyRepository } from '@domain/interfaces/repositories/part-supply.repository.interface';
import { UpdatePartSupplyDto } from '@application/ports/input/part-supply/dto/update-part-supply.dto';
import { inventoryCacheKeys } from '@application/keys/inventory-cache-keys';
import { ICache } from '@application/ports/output/cache.service.interface';
import { IUpdatePartSupplyUseCase } from '@application/ports/input/part-supply/update-part-supply.use-case.interface';

export class UpdatePartSupplyUseCase implements IUpdatePartSupplyUseCase {
  constructor(
    private readonly partSupplyRepository: IPartSupplyRepository,
    private readonly cache: ICache,
  ) {}

  async execute(id: string, input: UpdatePartSupplyDto): Promise<PartSupply> {
    const existing = await this.partSupplyRepository.findById(id);

    if (!existing) {
      throw new ResourceNotFoundException('Peça ou Insumo', id);
    }

    if (input.sku && input.sku !== existing.sku) {
      const withSameSku = await this.partSupplyRepository.findBySku(input.sku);

      if (withSameSku) {
        throw new ResourceConflictException(`SKU '${input.sku}' já está em uso`);
      }
    }

    existing.update(input);

    const updated = await this.partSupplyRepository.update(existing);

    await this.cache.delete([inventoryCacheKeys.partSupply(updated.id)]);

    return updated;
  }
}
