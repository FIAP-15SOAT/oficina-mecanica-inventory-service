import { PaginationInput } from '@domain/interfaces/common/pagination.interface';
import { PartSupplyCategory } from '@domain/enums/part-supply-category.enum';

export interface FindAllPartsSuppliesInputDto extends PaginationInput {
  name?: string;
  sku?: string;
  category?: PartSupplyCategory;
  lowStock?: boolean;
}
