import { PartSupply } from '@domain/entities/part-supply.entity';
import { PartSupplyCategory } from '@domain/enums/part-supply-category.enum';
import { PaginatedRepositoryResult, PaginationInput } from '../common/pagination.interface';

export interface PartSupplyFilters {
  name?: string;
  sku?: string;
  category?: PartSupplyCategory;

  lowStock?: boolean;
}

export interface IPartSupplyRepository {
  create(partSupply: PartSupply): Promise<PartSupply>;
  findById(id: string): Promise<PartSupply | null>;
  findByIds(ids: string[]): Promise<PartSupply[]>;
  findBySku(sku: string): Promise<PartSupply | null>;
  findAllPaginated(
    pagination: PaginationInput,
    filters: PartSupplyFilters,
  ): Promise<PaginatedRepositoryResult<PartSupply>>;
  update(partSupply: PartSupply): Promise<PartSupply>;
  delete(id: string): Promise<void>;
}
