import { Prisma, PartSupply as PrismaPartSupply } from '@generated/client';

import { PrismaService } from '@infrastructure/persistence/prisma/prisma.service';

import { ResourceConflictException } from '@application/exceptions/resource-conflict.exception';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';
import { ConcurrencyException } from '@infrastructure/exceptions/concurrency.exception';

import { PartSupply } from '@domain/entities/part-supply.entity';
import {
  IPartSupplyRepository,
  PartSupplyFilters,
} from '@domain/interfaces/repositories/part-supply.repository.interface';

import { PartSupplyMapper } from '@infrastructure/persistence/prisma/mappers/part-supply.mapper';
import {
  PaginatedRepositoryResult,
  PaginationInput,
} from '@domain/interfaces/common/pagination.interface';

import { paginate } from '@infrastructure/persistence/prisma/helpers/prisma-paginate.helper';

export class PrismaPartSupplyRepository implements IPartSupplyRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(partSupply: PartSupply): Promise<PartSupply> {
    try {
      const record = await this.prisma.partSupply.create({
        data: {
          id: partSupply.id,
          name: partSupply.name,
          description: partSupply.description,
          sku: partSupply.sku,
          partNumber: partSupply.partNumber,
          category: partSupply.category,
          unit: partSupply.unit,
          costPrice: partSupply.costPrice,
          salePrice: partSupply.salePrice,
          stock: partSupply.stock,
          minStock: partSupply.minStock,
          expiresAt: partSupply.expiresAt,
        },
      });

      return PartSupplyMapper.toDomain(record);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ResourceConflictException('Peça ou insumo já cadastrado');
      }
      throw error;
    }
  }

  async findById(id: string): Promise<PartSupply | null> {
    const record = await this.prisma.partSupply.findUnique({ where: { id } });
    return record ? PartSupplyMapper.toDomain(record) : null;
  }

  async findByIds(ids: string[]): Promise<PartSupply[]> {
    const records = await this.prisma.partSupply.findMany({
      where: { id: { in: ids } },
    });

    return records.map((record) => PartSupplyMapper.toDomain(record));
  }

  async findBySku(sku: string): Promise<PartSupply | null> {
    const record = await this.prisma.partSupply.findUnique({ where: { sku } });
    return record ? PartSupplyMapper.toDomain(record) : null;
  }

  async findAllPaginated(
    pagination: PaginationInput,
    filters: PartSupplyFilters,
  ): Promise<PaginatedRepositoryResult<PartSupply>> {
    const { name, sku, category, lowStock } = filters;

    const where: Prisma.PartSupplyWhereInput = {};

    if (name) where.name = { contains: name.trim(), mode: 'insensitive' };
    if (sku) where.sku = { contains: sku.trim(), mode: 'insensitive' };
    if (category) where.category = category;

    if (lowStock) {
      where['stock'] = { lte: this.prisma.partSupply.fields.minStock };
    }

    const result = await paginate(
      this.prisma.partSupply,
      {
        where,
        orderBy: { name: 'asc' },
      },
      pagination,
    );

    return {
      items: result.items.map((r: PrismaPartSupply) => PartSupplyMapper.toDomain(r)),
      total: result.total,
    };
  }

  async update(partSupply: PartSupply): Promise<PartSupply> {
    try {
      const record = await this.prisma.partSupply.update({
        where: { id: partSupply.id, version: partSupply.version },
        data: {
          name: partSupply.name,
          description: partSupply.description,
          sku: partSupply.sku,
          partNumber: partSupply.partNumber,
          category: partSupply.category,
          unit: partSupply.unit,
          costPrice: partSupply.costPrice,
          salePrice: partSupply.salePrice,
          minStock: partSupply.minStock,
          stock: partSupply.stock,
          reservedStock: partSupply.reservedStock,
          expiresAt: partSupply.expiresAt,
          updatedAt: partSupply.updatedAt,
          version: { increment: 1 },
        },
      });

      return PartSupplyMapper.toDomain(record);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new ConcurrencyException(
          'Peça/insumo foi modificado por outra operação. Tente novamente.',
        );
      }
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.prisma.partSupply.delete({ where: { id } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        // Removed by a concurrent request between the existence check and the delete.
        if (error.code === 'P2025') {
          throw new ResourceNotFoundException('Peça ou Insumo', id);
        }
        // ON DELETE RESTRICT from stock_movements and stock_reservations.
        if (error.code === 'P2003') {
          throw new ResourceConflictException(
            'Peça ou insumo não pode ser excluído pois possui movimentações de estoque ou reservas.',
          );
        }
      }
      throw error;
    }
  }
}
