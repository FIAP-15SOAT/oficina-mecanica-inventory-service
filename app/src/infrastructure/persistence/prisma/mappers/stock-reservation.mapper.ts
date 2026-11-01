import type {
  StockReservation as PrismaStockReservation,
  PartSupply as PrismaPartSupply,
} from '@generated/client';
import { StockReservation } from '@domain/entities/stock-reservation.entity';
import { PartSupplyMapper } from './part-supply.mapper';

type PrismaStockReservationRecord = PrismaStockReservation & {
  partSupply?: PrismaPartSupply | null;
};

export class StockReservationMapper {
  static toDomain(record: PrismaStockReservationRecord): StockReservation {
    const entity = StockReservation.reconstitute({
      id: record.id,
      partSupplyId: record.partSupplyId,
      workOrderId: record.workOrderId,
      quantity: record.quantity,
      createdAt: record.createdAt,
    });

    if (record.partSupply) {
      entity.partSupply = PartSupplyMapper.toDomain(record.partSupply);
    }

    return entity;
  }
}
