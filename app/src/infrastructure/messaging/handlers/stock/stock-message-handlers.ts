import { OnModuleInit } from '@nestjs/common';

import { BadRequestException } from '@application/exceptions/bad-request.exception';
import { MessageEnvelope } from '@application/messaging/message-envelope';
import { IConsumeReservedStockUseCase } from '@application/ports/input/stock/consume-reserved-stock.use-case.interface';
import { IReserveStockUseCase } from '@application/ports/input/stock/reserve-stock.use-case.interface';

import { MessageHandlerRegistry } from '../../message-handler.registry';
import { ConsumeReservedStockPayloadDto } from './dto/consume-reserved-stock-payload.dto';
import { ReserveStockPayloadDto } from './dto/reserve-stock-payload.dto';

// Throwing leaves the message unacknowledged, so it is redelivered and then dead-lettered.
export class StockMessageHandlers implements OnModuleInit {
  constructor(
    private readonly registry: MessageHandlerRegistry,
    private readonly reserveStockUseCase: IReserveStockUseCase,
    private readonly consumeReservedStockUseCase: IConsumeReservedStockUseCase,
  ) {}

  onModuleInit(): void {
    this.registry.register(
      'inventory.stock.reserve',
      (envelope) => this.reserveStock(envelope),
      ReserveStockPayloadDto,
    );

    this.registry.register(
      'inventory.stock.consume',
      (envelope) => this.consumeReservedStock(envelope),
      ConsumeReservedStockPayloadDto,
    );
  }

  private async reserveStock({
    workOrderId,
    payload,
  }: MessageEnvelope<'inventory.stock.reserve'>): Promise<void> {
    if (!workOrderId) {
      throw new BadRequestException('Comando de reserva sem o id da ordem de serviço');
    }

    await this.reserveStockUseCase.execute({
      workOrderId,
      quoteId: payload.quoteId,
      items: payload.items,
    });
  }

  private async consumeReservedStock({
    workOrderId,
  }: MessageEnvelope<'inventory.stock.consume'>): Promise<void> {
    if (!workOrderId) {
      throw new BadRequestException('Comando de baixa sem o id da ordem de serviço');
    }

    await this.consumeReservedStockUseCase.execute(workOrderId);
  }
}
