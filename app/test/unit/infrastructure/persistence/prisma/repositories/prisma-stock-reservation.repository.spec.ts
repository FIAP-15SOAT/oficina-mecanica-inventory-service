import { randomUUID } from 'node:crypto';

import { PrismaStockReservationRepository } from '@infrastructure/persistence/prisma/repositories/prisma-stock-reservation.repository';

import { StockReservation } from '@domain/entities/stock-reservation.entity';

import {
  createMockPrismaClient,
  MockPrismaService,
} from '../../../../../helpers/prisma-mock.factory';

describe('PrismaStockReservationRepository', () => {
  let repository: PrismaStockReservationRepository;
  let prisma: MockPrismaService;

  beforeEach(() => {
    prisma = createMockPrismaClient();
    repository = new PrismaStockReservationRepository(prisma);
  });

  describe('findByWorkOrderId', () => {
    it('should return reservations for a work order', async () => {
      prisma.stockReservation.findMany.mockResolvedValue([
        {
          id: randomUUID(),
          partSupplyId: randomUUID(),
          workOrderId: randomUUID(),
          quantity: 5,
          createdAt: new Date(),
        },
      ]);

      const result = await repository.findByWorkOrderId(randomUUID());

      expect(result).toHaveLength(1);
    });
  });

  describe('createMany', () => {
    it('should create multiple stock reservations', async () => {
      const reservations = [
        StockReservation.create({
          partSupplyId: randomUUID(),
          workOrderId: randomUUID(),
          quantity: 5,
        }),
      ];

      prisma.stockReservation.createMany.mockResolvedValue({ count: 1 });

      await repository.createMany(reservations);

      expect(prisma.stockReservation.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([expect.objectContaining({ id: reservations[0].id })]),
      });
    });
  });

  describe('deleteByWorkOrderId', () => {
    it('should delete reservations for a work order', async () => {
      const workOrderId = randomUUID();
      prisma.stockReservation.deleteMany.mockResolvedValue({ count: 1 });

      await repository.deleteByWorkOrderId(workOrderId);

      expect(prisma.stockReservation.deleteMany).toHaveBeenCalledWith({ where: { workOrderId } });
    });
  });

  describe('findAllPaginated', () => {
    it('should return paginated stock reservations', async () => {
      prisma.stockReservation.findMany.mockResolvedValue([
        {
          id: randomUUID(),
          partSupplyId: randomUUID(),
          workOrderId: randomUUID(),
          quantity: 5,
          createdAt: new Date(),
        },
      ]);
      prisma.stockReservation.count.mockResolvedValue(1);

      const result = await repository.findAllPaginated({ page: 1, limit: 10 }, {});

      expect(result.total).toBe(1);
      expect(result.items).toHaveLength(1);
    });
    it('should filter by partSupplyId', async () => {
      const partSupplyId = randomUUID();
      prisma.stockReservation.findMany.mockResolvedValue([]);
      prisma.stockReservation.count.mockResolvedValue(0);

      await repository.findAllPaginated({ page: 1, limit: 10 }, { partSupplyId });

      expect(prisma.stockReservation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ partSupplyId }) }),
      );
    });

    it('should filter by workOrderId', async () => {
      const workOrderId = randomUUID();
      prisma.stockReservation.findMany.mockResolvedValue([]);
      prisma.stockReservation.count.mockResolvedValue(0);

      await repository.findAllPaginated({ page: 1, limit: 10 }, { workOrderId });

      expect(prisma.stockReservation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ workOrderId }) }),
      );
    });
  });
});
