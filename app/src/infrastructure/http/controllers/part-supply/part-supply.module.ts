import { Module } from '@nestjs/common';

import { CreatePartSupplyUseCase } from '@application/use-cases/part-supply/create-part-supply.use-case';
import { FindAllPartsSuppliesUseCase } from '@application/use-cases/part-supply/find-all-parts-supplies.use-case';
import { FindPartSupplyByIdUseCase } from '@application/use-cases/part-supply/find-part-supply-by-id.use-case';
import { UpdatePartSupplyUseCase } from '@application/use-cases/part-supply/update-part-supply.use-case';
import { UpdateStockUseCase } from '@application/use-cases/part-supply/update-stock.use-case';

import { IPartSupplyRepository } from '@domain/interfaces/repositories/part-supply.repository.interface';
import { IUnitOfWork } from '@domain/interfaces/repositories/unit-of-work.interface';
import { ICache } from '@application/ports/output/cache.service.interface';
import { ILogger } from '@application/ports/output/logger.service.interface';

import { PartSupplyController as PartSupplyCleanController } from '@interface-adapters/part-supply/part-supply.controller';
import { PartSupplyController } from './part-supply.controller';

@Module({
  exports: [PartSupplyCleanController],
  controllers: [PartSupplyController],
  providers: [
    {
      provide: PartSupplyCleanController,
      useFactory: (
        partSupplyRepository: IPartSupplyRepository,
        unitOfWork: IUnitOfWork,
        cache: ICache,
        logger: ILogger,
      ) =>
        new PartSupplyCleanController(
          new CreatePartSupplyUseCase(partSupplyRepository, cache),
          new FindAllPartsSuppliesUseCase(partSupplyRepository),
          new FindPartSupplyByIdUseCase(partSupplyRepository, cache),
          new UpdatePartSupplyUseCase(partSupplyRepository, cache),
          new UpdateStockUseCase(unitOfWork, cache, logger.forContext(UpdateStockUseCase.name)),
        ),
      inject: ['IPartSupplyRepository', 'IUnitOfWork', 'ICache', 'ILogger'],
    },
  ],
})
export class PartSupplyModule {}
