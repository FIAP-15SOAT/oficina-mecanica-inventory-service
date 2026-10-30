import { Prisma } from '@generated/client';

import { PrismaService } from '../prisma.service';

import { StockMovement } from '@domain/entities/stock-movement.entity';
import {
  PaginatedRepositoryResult,
  PaginationInput,
} from '@domain/interfaces/common/pagination.interface';

import {
  IStockMovementRepository,
  StockMovementFilters,
} from '@domain/interfaces/repositories/stock-movement.repository.interface';

import { StockMovementMapper } from '@infrastructure/persistence/prisma/mappers/stock-movement.mapper';

import { paginate } from '@infrastructure/persistence/prisma/helpers/prisma-paginate.helper';

const STOCK_MOVEMENT_INCLUDE = {
  partSupply: true,
} as const;

export class PrismaStockMovementRepository implements IStockMovementRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(movement: StockMovement): Promise<StockMovement> {
    const record = await this.prisma.stockMovement.create({
      data: {
        id: movement.id,
        partSupplyId: movement.partSupplyId,
        workOrderId: movement.workOrderId,
        type: movement.type,
        quantity: movement.quantity,
        reason: movement.reason,
      },
    });

    return StockMovementMapper.toDomain(record);
  }

  async createMany(movements: StockMovement[]): Promise<void> {
    await this.prisma.stockMovement.createMany({
      data: movements.map((m) => ({
        id: m.id,
        partSupplyId: m.partSupplyId,
        workOrderId: m.workOrderId,
        type: m.type,
        quantity: m.quantity,
        reason: m.reason,
      })),
    });
  }

  async findAllPaginated(
    pagination: PaginationInput,
    filters: StockMovementFilters,
  ): Promise<PaginatedRepositoryResult<StockMovement>> {
    const { partSupplyId, workOrderId, type, startDate, endDate } = filters;

    const where: Prisma.StockMovementWhereInput = {};

    if (partSupplyId) where.partSupplyId = partSupplyId;
    if (workOrderId) where.workOrderId = workOrderId;
    if (type) where.type = type;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const result = await paginate(
      this.prisma.stockMovement,
      {
        where,
        orderBy: { createdAt: 'desc' },
        include: STOCK_MOVEMENT_INCLUDE,
      },
      pagination,
    );

    return {
      items: result.items.map((r) =>
        StockMovementMapper.toDomain(r as Parameters<typeof StockMovementMapper.toDomain>[0]),
      ),
      total: result.total,
    };
  }
}
