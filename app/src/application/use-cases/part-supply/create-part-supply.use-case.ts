import { PartSupply } from '@domain/entities/part-supply.entity';

import { IPartSupplyRepository } from '@domain/interfaces/repositories/part-supply.repository.interface';
import { ICreatePartSupplyUseCase } from '@application/ports/input/part-supply/create-part-supply.use-case.interface';

import { CreatePartSupplyDto } from '@application/ports/input/part-supply/dto/create-part-supply.dto';
import { ResourceConflictException } from '@application/exceptions/resource-conflict.exception';
import { inventoryCacheKeys } from '@application/keys/inventory-cache-keys';
import { ICache } from '@application/ports/output/cache.service.interface';

export class CreatePartSupplyUseCase implements ICreatePartSupplyUseCase {
  constructor(
    private readonly partSupplyRepository: IPartSupplyRepository,
    private readonly cache: ICache,
  ) {}

  async execute(input: CreatePartSupplyDto): Promise<PartSupply> {
    const existing = await this.partSupplyRepository.findBySku(input.sku);

    if (existing) {
      throw new ResourceConflictException(`SKU '${input.sku}' já está em uso`);
    }

    const created = await this.partSupplyRepository.create(PartSupply.create(input));

    await this.cache.delete([inventoryCacheKeys.partSupply(created.id)]);

    return created;
  }
}
