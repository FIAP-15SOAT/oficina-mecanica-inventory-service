import { Prisma } from '@generated/client';

import { PrismaService } from '../prisma.service';

import { StockReservation } from '@domain/entities/stock-reservation.entity';
import {
  PaginatedRepositoryResult,
  PaginationInput,
} from '@domain/interfaces/common/pagination.interface';

import {
  IStockReservationRepository,
  StockReservationFilters,
} from '@domain/interfaces/repositories/stock-reservation.repository.interface';
import { StockReservationMapper } from '@infrastructure/persistence/prisma/mappers/stock-reservation.mapper';

import { paginate } from '@infrastructure/persistence/prisma/helpers/prisma-paginate.helper';

const STOCK_RESERVATION_INCLUDE = {
  partSupply: true,
} as const;

export class PrismaStockReservationRepository implements IStockReservationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createMany(reservations: StockReservation[]): Promise<void> {
    await this.prisma.stockReservation.createMany({
      data: reservations.map((r) => ({
        id: r.id,
        partSupplyId: r.partSupplyId,
        workOrderId: r.workOrderId,
        quantity: r.quantity,
      })),
    });
  }

  async findByWorkOrderId(workOrderId: string): Promise<StockReservation[]> {
    const records = await this.prisma.stockReservation.findMany({ where: { workOrderId } });
    return records.map((r) => StockReservationMapper.toDomain(r));
  }

  async findAllPaginated(
    pagination: PaginationInput,
    filters: StockReservationFilters,
  ): Promise<PaginatedRepositoryResult<StockReservation>> {
    const { partSupplyId, workOrderId } = filters;

    const where: Prisma.StockReservationWhereInput = {};

    if (partSupplyId) where.partSupplyId = partSupplyId;
    if (workOrderId) where.workOrderId = workOrderId;

    const result = await paginate(
      this.prisma.stockReservation,
      {
        where,
        orderBy: { createdAt: 'desc' },
        include: STOCK_RESERVATION_INCLUDE,
      },
      pagination,
    );

    return {
      items: result.items.map((r) =>
        StockReservationMapper.toDomain(r as Parameters<typeof StockReservationMapper.toDomain>[0]),
      ),
      total: result.total,
    };
  }

  async deleteByWorkOrderId(workOrderId: string): Promise<void> {
    await this.prisma.stockReservation.deleteMany({ where: { workOrderId } });
  }
}
