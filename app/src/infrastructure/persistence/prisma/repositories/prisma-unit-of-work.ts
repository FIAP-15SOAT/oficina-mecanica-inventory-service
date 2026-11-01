import { Injectable } from '@nestjs/common';
import { Prisma } from '@generated/client';

import { PrismaService } from '@infrastructure/persistence/prisma/prisma.service';

import { IUnitOfWork, IRepositories } from '@domain/interfaces/repositories/unit-of-work.interface';
import { PrismaOutboxRepository } from './prisma-outbox.repository';
import { PrismaPartSupplyRepository } from './prisma-part-supply.repository';
import { PrismaServiceRepository } from './prisma-service.repository';
import { PrismaStockMovementRepository } from './prisma-stock-movement.repository';
import { PrismaStockReservationRepository } from './prisma-stock-reservation.repository';

@Injectable()
export class PrismaUnitOfWork implements IUnitOfWork {
  constructor(private readonly prisma: PrismaService) {}

  async executeTransaction<T>(work: (repositories: IRepositories) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const client = tx as unknown as PrismaService;
      const repositories: IRepositories = {
        outbox: new PrismaOutboxRepository(client),
        partSupply: new PrismaPartSupplyRepository(client),
        service: new PrismaServiceRepository(client),
        stockMovement: new PrismaStockMovementRepository(client),
        stockReservation: new PrismaStockReservationRepository(client),
      };

      return work(repositories);
    });
  }
}
