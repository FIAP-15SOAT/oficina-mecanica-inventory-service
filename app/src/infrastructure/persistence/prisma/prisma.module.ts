import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { PrismaPartSupplyRepository } from './repositories/prisma-part-supply.repository';
import { PrismaServiceRepository } from './repositories/prisma-service.repository';
import { PrismaStockMovementRepository } from './repositories/prisma-stock-movement.repository';
import { PrismaStockReservationRepository } from './repositories/prisma-stock-reservation.repository';
import { PrismaUnitOfWork } from './repositories/prisma-unit-of-work';

const UNIT_OF_WORK_PROVIDER = { provide: 'IUnitOfWork', useClass: PrismaUnitOfWork };

// Outside a transaction (reads, cache misses) the repositories run on the shared client.
const REPOSITORY_PROVIDERS = [
  {
    provide: 'IPartSupplyRepository',
    useFactory: (prisma: PrismaService) => new PrismaPartSupplyRepository(prisma),
    inject: [PrismaService],
  },
  {
    provide: 'IServiceRepository',
    useFactory: (prisma: PrismaService) => new PrismaServiceRepository(prisma),
    inject: [PrismaService],
  },
  {
    provide: 'IStockMovementRepository',
    useFactory: (prisma: PrismaService) => new PrismaStockMovementRepository(prisma),
    inject: [PrismaService],
  },
  {
    provide: 'IStockReservationRepository',
    useFactory: (prisma: PrismaService) => new PrismaStockReservationRepository(prisma),
    inject: [PrismaService],
  },
];

@Global()
@Module({
  providers: [PrismaService, UNIT_OF_WORK_PROVIDER, ...REPOSITORY_PROVIDERS],
  exports: [PrismaService, UNIT_OF_WORK_PROVIDER, ...REPOSITORY_PROVIDERS],
})
export class PrismaModule {}
