import { Global, Module } from '@nestjs/common';

import { PrismaPartSupplyRepository } from './prisma-part-supply.repository';
import { PrismaServiceRepository } from './prisma-service.repository';
import { PrismaStockMovementRepository } from './prisma-stock-movement.repository';
import { PrismaStockReservationRepository } from './prisma-stock-reservation.repository';
import { PrismaUnitOfWork } from './prisma-unit-of-work';

const REPOSITORY_PROVIDERS = [
  { provide: 'IPartSupplyRepository', useClass: PrismaPartSupplyRepository },
  { provide: 'IServiceRepository', useClass: PrismaServiceRepository },
  { provide: 'IStockMovementRepository', useClass: PrismaStockMovementRepository },
  { provide: 'IStockReservationRepository', useClass: PrismaStockReservationRepository },
  { provide: 'IUnitOfWork', useClass: PrismaUnitOfWork },
];

@Global()
@Module({
  providers: REPOSITORY_PROVIDERS,
  exports: REPOSITORY_PROVIDERS,
})
export class RepositoriesModule {}
