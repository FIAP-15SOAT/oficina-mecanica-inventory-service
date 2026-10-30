import { randomUUID } from 'node:crypto';
import { Prisma } from '@generated/client';

import { StockMovementMapper } from '@infrastructure/persistence/prisma/mappers/stock-movement.mapper';

import { StockMovementType } from '@domain/enums/stock-movement-type.enum';
import { PartSupplyCategory } from '@domain/enums/part-supply-category.enum';
import { Unit } from '@domain/enums/unit.enum';

describe('StockMovementMapper', () => {
  describe('toDomain', () => {
    it('should map a Prisma record to a domain entity', () => {
      const now = new Date();
      const prismaRecord = {
        id: randomUUID(),
        partSupplyId: randomUUID(),
        workOrderId: randomUUID(),
        type: StockMovementType.ENTRY,
        quantity: 10,
        reason: 'Restock',
        createdAt: now,
      };

      const domainEntity = StockMovementMapper.toDomain(prismaRecord);

      expect(domainEntity.id).toBe(prismaRecord.id);
      expect(domainEntity.partSupplyId).toBe(prismaRecord.partSupplyId);
      expect(domainEntity.workOrderId).toBe(prismaRecord.workOrderId);
      expect(domainEntity.type).toBe(StockMovementType.ENTRY);
      expect(domainEntity.quantity).toBe(10);
      expect(domainEntity.reason).toBe('Restock');
      expect(domainEntity.createdAt).toBe(prismaRecord.createdAt);
    });

    it('should map a Prisma record with nulls to a domain entity', () => {
      const now = new Date();
      const prismaRecord = {
        id: randomUUID(),
        partSupplyId: randomUUID(),
        workOrderId: null,
        type: StockMovementType.EXIT,
        quantity: 5,
        reason: null,
        createdAt: now,
      };

      const domainEntity = StockMovementMapper.toDomain(prismaRecord);

      expect(domainEntity.workOrderId).toBeNull();
      expect(domainEntity.reason).toBeNull();
    });

    it('should map partSupply relation when present', () => {
      const now = new Date();
      const partSupplyId = randomUUID();
      const workOrderId = randomUUID();
      const prismaRecord = {
        id: randomUUID(),
        partSupplyId,
        workOrderId,
        type: StockMovementType.EXIT,
        quantity: 2,
        reason: null,
        createdAt: now,
        partSupply: {
          id: partSupplyId,
          name: 'Filtro de Óleo',
          description: null,
          sku: 'FO-001',
          partNumber: null,
          category: PartSupplyCategory.PART,
          unit: Unit.UN,
          costPrice: new Prisma.Decimal(25),
          salePrice: new Prisma.Decimal(45),
          stock: 10,
          minStock: 2,
          reservedStock: 0,
          version: 0,
          expiresAt: null,
          createdAt: now,
          updatedAt: now,
        },
      };

      const domainEntity = StockMovementMapper.toDomain(prismaRecord);

      expect(domainEntity.partSupply).toBeDefined();
      expect(domainEntity.partSupply!.id).toBe(partSupplyId);
    });
  });
});
