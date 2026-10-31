import { PaginationQuery } from '@domain/interfaces/common/pagination.interface';
import { PartSupplyCategory } from '@domain/enums/part-supply-category.enum';

export interface FindAllPartsSuppliesQuery extends PaginationQuery {
  name?: string;
  sku?: string;
  category?: PartSupplyCategory;
  lowStock?: boolean;
}
