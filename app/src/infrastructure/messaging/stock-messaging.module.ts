import { Module, OnModuleInit } from '@nestjs/common';

import { ReserveStockUseCase } from '@application/use-cases/stock/reserve-stock.use-case';
import { ICache } from '@application/ports/output/cache.service.interface';
import { ILogger } from '@application/ports/output/logger.service.interface';
import { IMetrics } from '@application/ports/output/metrics.service.interface';
import { IUnitOfWork } from '@domain/interfaces/repositories/unit-of-work.interface';

import { ReserveStockHandler } from './handlers/reserve-stock.handler';
import { ReserveStockPayload } from './handlers/reserve-stock.payload';
import { MessageHandlerRegistry } from './message-handler.registry';

@Module({
  providers: [
    {
      provide: ReserveStockHandler,
      useFactory: (unitOfWork: IUnitOfWork, cache: ICache, logger: ILogger, metrics: IMetrics) =>
        new ReserveStockHandler(
          new ReserveStockUseCase(
            unitOfWork,
            cache,
            logger.forContext(ReserveStockUseCase.name),
            metrics,
          ),
        ),
      inject: ['IUnitOfWork', 'ICache', 'ILogger', 'IMetrics'],
    },
  ],
})
export class StockMessagingModule implements OnModuleInit {
  constructor(
    private readonly registry: MessageHandlerRegistry,
    private readonly reserveStock: ReserveStockHandler,
  ) {}

  onModuleInit(): void {
    this.registry.register(
      'inventory.stock.reserve',
      this.reserveStock.handle,
      ReserveStockPayload,
    );
  }
}
