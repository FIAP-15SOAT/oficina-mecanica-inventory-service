import { BadRequestException } from '@application/exceptions/bad-request.exception';
import { MessageHandler } from '@application/messaging/message-envelope';
import { IReserveStockUseCase } from '@application/ports/input/stock/reserve-stock.use-case.interface';

export class ReserveStockHandler {
  constructor(private readonly reserveStock: IReserveStockUseCase) {}

  // Throwing leaves the message unacknowledged, so it is redelivered and then dead-lettered.
  readonly handle: MessageHandler<'inventory.stock.reserve'> = async (envelope) => {
    if (!envelope.workOrderId) {
      throw new BadRequestException('Comando de reserva sem o id da ordem de serviço.');
    }

    await this.reserveStock.execute({
      workOrderId: envelope.workOrderId,
      quoteId: envelope.payload.quoteId,
      items: envelope.payload.items,
    });
  };
}
