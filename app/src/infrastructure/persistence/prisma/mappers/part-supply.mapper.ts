import { PartSupply as PrismaPartSupply } from '@generated/client';
import { PartSupply } from '@domain/entities/part-supply.entity';
import { PartSupplyCategory } from '@domain/enums/part-supply-category.enum';
import { Unit } from '@domain/enums/unit.enum';

export class PartSupplyMapper {
  static toDomain(prismaRecord: PrismaPartSupply): PartSupply {
    return PartSupply.reconstitute({
      id: prismaRecord.id,
      name: prismaRecord.name,
      description: prismaRecord.description,
      sku: prismaRecord.sku,
      partNumber: prismaRecord.partNumber,
      category: prismaRecord.category as PartSupplyCategory,
      unit: prismaRecord.unit as Unit,
      costPrice: Number(prismaRecord.costPrice),
      salePrice: Number(prismaRecord.salePrice),
      stock: prismaRecord.stock,
      minStock: prismaRecord.minStock,
      reservedStock: prismaRecord.reservedStock,
      version: prismaRecord.version,
      expiresAt: prismaRecord.expiresAt ?? null,

      createdAt: prismaRecord.createdAt,
      updatedAt: prismaRecord.updatedAt,
    });
  }
}
