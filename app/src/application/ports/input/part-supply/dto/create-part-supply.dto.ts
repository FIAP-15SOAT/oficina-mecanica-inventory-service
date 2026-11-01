import { PartSupplyCategory } from '@domain/enums/part-supply-category.enum';
import { Unit } from '@domain/enums/unit.enum';

export interface CreatePartSupplyDto {
  name: string;
  description?: string;
  sku: string;
  partNumber?: string;
  category: PartSupplyCategory;
  unit: Unit;
  costPrice: number;
  salePrice: number;
  stock?: number;
  minStock?: number;
  expiresAt?: Date;
}
