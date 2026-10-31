import type {
  StockMovement as PrismaStockMovement,
  PartSupply as PrismaPartSupply,
} from '@generated/client';
import { StockMovement } from '@domain/entities/stock-movement.entity';
import { StockMovementType } from '@domain/enums/stock-movement-type.enum';
import { PartSupplyMapper } from './part-supply.mapper';

type PrismaStockMovementRecord = PrismaStockMovement & {
  partSupply?: PrismaPartSupply | null;
};

export class StockMovementMapper {
  static toDomain(record: PrismaStockMovementRecord): StockMovement {
    const entity = StockMovement.reconstitute({
      id: record.id,
      partSupplyId: record.partSupplyId,
      workOrderId: record.workOrderId ?? null,
      type: record.type as StockMovementType,
      quantity: record.quantity,
      reason: record.reason ?? null,
      createdAt: record.createdAt,
    });

    if (record.partSupply) {
      entity.partSupply = PartSupplyMapper.toDomain(record.partSupply);
    }

    return entity;
  }
}
