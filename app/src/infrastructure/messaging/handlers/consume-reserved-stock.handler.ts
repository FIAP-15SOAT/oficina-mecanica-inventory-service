import { BadRequestException } from '@application/exceptions/bad-request.exception';
import { MessageHandler } from '@application/messaging/message-envelope';
import { IConsumeReservedStockUseCase } from '@application/ports/input/stock/consume-reserved-stock.use-case.interface';

export class ConsumeReservedStockHandler {
  constructor(private readonly consumeReservedStock: IConsumeReservedStockUseCase) {}

  // Throwing leaves the message unacknowledged, so it is redelivered and then dead-lettered.
  readonly handle: MessageHandler<'inventory.stock.consume'> = async (envelope) => {
    if (!envelope.workOrderId) {
      throw new BadRequestException('Comando de baixa sem o id da ordem de serviço.');
    }

    await this.consumeReservedStock.execute({ workOrderId: envelope.workOrderId });
  };
}
