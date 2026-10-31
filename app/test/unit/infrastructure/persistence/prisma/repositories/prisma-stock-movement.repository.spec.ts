import { randomUUID } from 'node:crypto';

import { PrismaStockMovementRepository } from '@infrastructure/persistence/prisma/repositories/prisma-stock-movement.repository';

import { StockMovement } from '@domain/entities/stock-movement.entity';
import { StockMovementType } from '@domain/enums/stock-movement-type.enum';

import {
  createMockPrismaClient,
  MockPrismaService,
} from '../../../../../helpers/prisma-mock.factory';

describe('PrismaStockMovementRepository', () => {
  let repository: PrismaStockMovementRepository;
  let prisma: MockPrismaService;

  beforeEach(() => {
    prisma = createMockPrismaClient();
    repository = new PrismaStockMovementRepository(prisma);
  });

  describe('create', () => {
    it('should create a stock movement', async () => {
      const movement = StockMovement.create({
        partSupplyId: randomUUID(),
        type: StockMovementType.ENTRY,
        quantity: 10,
        reason: 'Restock',
      });

      prisma.stockMovement.create.mockResolvedValue({
        id: movement.id,
        partSupplyId: movement.partSupplyId,
        workOrderId: movement.workOrderId,
        type: movement.type,
        quantity: movement.quantity,
        reason: movement.reason,
        createdAt: movement.createdAt,
      });

      const result = await repository.create(movement);

      expect(result.id).toBe(movement.id);
      expect(prisma.stockMovement.create).toHaveBeenCalled();
    });
  });

  describe('createMany', () => {
    it('should call createMany with mapped data', async () => {
      const m1 = StockMovement.create({
        partSupplyId: randomUUID(),
        type: StockMovementType.EXIT,
        quantity: 5,
        reason: 'OS-001',
      });
      const m2 = StockMovement.create({
        partSupplyId: randomUUID(),
        type: StockMovementType.EXIT,
        quantity: 2,
        reason: 'OS-001',
      });

      prisma.stockMovement.createMany.mockResolvedValue({ count: 2 });

      await repository.createMany([m1, m2]);

      expect(prisma.stockMovement.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({ partSupplyId: m1.partSupplyId, quantity: 5 }),
          expect.objectContaining({ partSupplyId: m2.partSupplyId, quantity: 2 }),
        ]),
      });
    });
  });

  describe('findAllPaginated', () => {
    it('should return paginated stock movements', async () => {
      prisma.stockMovement.findMany.mockResolvedValue([
        {
          id: randomUUID(),
          partSupplyId: randomUUID(),
          workOrderId: null,
          type: StockMovementType.ENTRY,
          quantity: 10,
          reason: null,
          createdAt: new Date(),
        },
      ]);
      prisma.stockMovement.count.mockResolvedValue(1);

      const result = await repository.findAllPaginated({ page: 1, limit: 10 }, {});

      expect(result.total).toBe(1);
      expect(result.items).toHaveLength(1);
    });

    it('should apply filters correctly', async () => {
      prisma.stockMovement.findMany.mockResolvedValue([]);
      prisma.stockMovement.count.mockResolvedValue(0);

      const partSupplyId = randomUUID();
      const workOrderId = randomUUID();
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      await repository.findAllPaginated(
        { page: 1, limit: 10 },
        {
          partSupplyId,
          workOrderId,
          type: StockMovementType.ENTRY,
          startDate,
          endDate,
        },
      );

      expect(prisma.stockMovement.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            partSupplyId,
            workOrderId,
            type: StockMovementType.ENTRY,
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          },
        }),
      );
    });

    it('should apply startDate filter only', async () => {
      prisma.stockMovement.findMany.mockResolvedValue([]);
      prisma.stockMovement.count.mockResolvedValue(0);
      const startDate = new Date();
      await repository.findAllPaginated({ page: 1, limit: 10 }, { startDate });
      expect(prisma.stockMovement.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { createdAt: { gte: startDate } } }),
      );
    });

    it('should apply endDate filter only', async () => {
      prisma.stockMovement.findMany.mockResolvedValue([]);
      prisma.stockMovement.count.mockResolvedValue(0);
      const endDate = new Date();
      await repository.findAllPaginated({ page: 1, limit: 10 }, { endDate });
      expect(prisma.stockMovement.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { createdAt: { lte: endDate } } }),
      );
    });
  });
});
