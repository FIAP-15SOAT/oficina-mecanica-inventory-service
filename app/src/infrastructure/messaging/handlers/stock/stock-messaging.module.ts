import { Module } from '@nestjs/common';

import { IUnitOfWork } from '@domain/interfaces/repositories/unit-of-work.interface';

import { ICache } from '@application/ports/output/services/cache.service.interface';
import { ILogger } from '@application/ports/output/services/logger.service.interface';
import { IMetrics } from '@application/ports/output/services/metrics.service.interface';
import { ConsumeReservedStockUseCase } from '@application/use-cases/stock/consume-reserved-stock.use-case';
import { ReserveStockUseCase } from '@application/use-cases/stock/reserve-stock.use-case';

import { MessageHandlerRegistry } from '../../message-handler.registry';
import { StockMessageHandlers } from './stock-message-handlers';

@Module({
  providers: [
    {
      provide: StockMessageHandlers,
      useFactory: (
        registry: MessageHandlerRegistry,
        unitOfWork: IUnitOfWork,
        cache: ICache,
        logger: ILogger,
        metrics: IMetrics,
      ) =>
        new StockMessageHandlers(
          registry,
          new ReserveStockUseCase(
            unitOfWork,
            cache,
            logger.forContext(ReserveStockUseCase.name),
            metrics,
          ),
          new ConsumeReservedStockUseCase(
            unitOfWork,
            cache,
            logger.forContext(ConsumeReservedStockUseCase.name),
          ),
        ),
      inject: [MessageHandlerRegistry, 'IUnitOfWork', 'ICache', 'ILogger', 'IMetrics'],
    },
  ],
})
export class StockMessagingModule {}
