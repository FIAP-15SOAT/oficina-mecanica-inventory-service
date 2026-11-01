import { randomUUID } from 'node:crypto';
import { Prisma } from '@generated/client';

import { StockReservationMapper } from '@infrastructure/persistence/prisma/mappers/stock-reservation.mapper';

import { PartSupplyCategory } from '@domain/enums/part-supply-category.enum';
import { Unit } from '@domain/enums/unit.enum';

describe('StockReservationMapper', () => {
  describe('toDomain', () => {
    it('should map a Prisma record to a domain entity', () => {
      const now = new Date();
      const prismaRecord = {
        id: randomUUID(),
        partSupplyId: randomUUID(),
        workOrderId: randomUUID(),
        quantity: 5,
        createdAt: now,
      };

      const domainEntity = StockReservationMapper.toDomain(prismaRecord);

      expect(domainEntity.id).toBe(prismaRecord.id);
      expect(domainEntity.partSupplyId).toBe(prismaRecord.partSupplyId);
      expect(domainEntity.workOrderId).toBe(prismaRecord.workOrderId);
      expect(domainEntity.quantity).toBe(5);
      expect(domainEntity.createdAt).toBe(prismaRecord.createdAt);
    });

    it('should map partSupply relation when present', () => {
      const now = new Date();
      const partSupplyId = randomUUID();
      const workOrderId = randomUUID();
      const prismaRecord = {
        id: randomUUID(),
        partSupplyId,
        workOrderId,
        quantity: 3,
        createdAt: now,
        partSupply: {
          id: partSupplyId,
          name: 'Vela de Ignição',
          description: null,
          sku: 'VI-001',
          partNumber: null,
          category: PartSupplyCategory.PART,
          unit: Unit.UN,
          costPrice: new Prisma.Decimal(15),
          salePrice: new Prisma.Decimal(30),
          stock: 20,
          minStock: 5,
          reservedStock: 3,
          version: 0,
          expiresAt: null,
          createdAt: now,
          updatedAt: now,
        },
      };

      const domainEntity = StockReservationMapper.toDomain(prismaRecord);

      expect(domainEntity.partSupply).toBeDefined();
      expect(domainEntity.partSupply!.id).toBe(partSupplyId);
    });
  });
});
