import { PartSupplyCategory } from '@domain/enums/part-supply-category.enum';
import { Unit } from '@domain/enums/unit.enum';

export interface UpdatePartSupplyDto {
  name: string;
  sku: string;
  category: PartSupplyCategory;
  unit: Unit;
  costPrice: number;
  salePrice: number;
  description?: string;
  partNumber?: string;
  minStock?: number;
  expiresAt?: Date;
}
