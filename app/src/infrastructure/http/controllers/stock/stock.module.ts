import { Module } from '@nestjs/common';

import { FindStockMovementsUseCase } from '@application/use-cases/stock/find-stock-movements.use-case';
import { FindStockReservationsUseCase } from '@application/use-cases/stock/find-stock-reservations.use-case';

import { IStockMovementRepository } from '@domain/interfaces/repositories/stock-movement.repository.interface';
import { IStockReservationRepository } from '@domain/interfaces/repositories/stock-reservation.repository.interface';

import { StockController as StockCleanController } from '@interface-adapters/stock/stock.controller';
import { StockMovementsController } from './stock-movements.controller';
import { StockReservationsController } from './stock-reservations.controller';

@Module({
  controllers: [StockMovementsController, StockReservationsController],
  providers: [
    {
      provide: StockCleanController,
      useFactory: (
        movementRepository: IStockMovementRepository,
        reservationRepository: IStockReservationRepository,
      ) =>
        new StockCleanController(
          new FindStockMovementsUseCase(movementRepository),
          new FindStockReservationsUseCase(reservationRepository),
        ),
      inject: ['IStockMovementRepository', 'IStockReservationRepository'],
    },
  ],
})
export class StockModule {}
