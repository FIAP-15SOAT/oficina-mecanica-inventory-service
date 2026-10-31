import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { MessageEnvelope } from '@application/messaging/message-envelope';
import { IReserveStockUseCase } from '@application/ports/input/stock/reserve-stock.use-case.interface';
import { ReserveStockHandler } from '@infrastructure/messaging/handlers/reserve-stock.handler';
import { ReserveStockPayload } from '@infrastructure/messaging/handlers/reserve-stock.payload';
import { ConsumeReservedStockHandler } from '@infrastructure/messaging/handlers/consume-reserved-stock.handler';
import { ConsumeReservedStockPayload } from '@infrastructure/messaging/handlers/consume-reserved-stock.payload';
import { MessageHandlerRegistry } from '@infrastructure/messaging/message-handler.registry';
import { StockMessagingModule } from '@infrastructure/messaging/stock-messaging.module';

describe('ReserveStockHandler', () => {
  let useCase: jest.Mocked<IReserveStockUseCase>;
  let handler: ReserveStockHandler;

  const payload = {
    quoteId: randomUUID(),
    items: [{ partSupplyId: randomUUID(), quantity: 2 }],
  };

  function envelope(workOrderId: string | null): MessageEnvelope<'inventory.stock.reserve'> {
    return {
      messageId: randomUUID(),
      type: 'inventory.stock.reserve',
      occurredAt: new Date().toISOString(),
      workOrderId,
      payload,
    };
  }

  beforeEach(() => {
    useCase = { execute: jest.fn().mockResolvedValue({ outcome: 'reserved' }) };
    handler = new ReserveStockHandler(useCase);
  });

  it('reserves with the work order from the envelope and the quote from the payload', async () => {
    const workOrderId = randomUUID();

    await handler.handle(envelope(workOrderId));

    expect(useCase.execute).toHaveBeenCalledWith({
      workOrderId,
      quoteId: payload.quoteId,
      items: payload.items,
    });
  });

  it('fails without workOrderId in the envelope', async () => {
    await expect(handler.handle(envelope(null))).rejects.toThrow(
      'Comando de reserva sem o id da ordem de serviço',
    );

    expect(useCase.execute).not.toHaveBeenCalled();
  });
});

describe('ReserveStockPayload', () => {
  async function invalidProperties(plain: object): Promise<string[]> {
    const errors = await validate(plainToInstance(ReserveStockPayload, plain));

    return errors.map((error) => error.property);
  }

  function item(fields: Record<string, unknown> = {}): Record<string, unknown> {
    return { partSupplyId: randomUUID(), quantity: 1, ...fields };
  }

  it('accepts a valid payload', async () => {
    expect(await invalidProperties({ quoteId: randomUUID(), items: [item(), item()] })).toEqual([]);
  });

  it('rejects a non-uuid quoteId', async () => {
    expect(await invalidProperties({ quoteId: 'quote-1', items: [item()] })).toEqual(['quoteId']);
  });

  it('rejects empty items', async () => {
    expect(await invalidProperties({ quoteId: randomUUID(), items: [] })).toEqual(['items']);
  });

  it('rejects items that are not an array', async () => {
    expect(await invalidProperties({ quoteId: randomUUID(), items: item() })).toEqual(['items']);
  });

  it.each([0, -1, 1.5, '2'])('rejects quantity zero or fractional (%p)', async (quantity) => {
    expect(await invalidProperties({ quoteId: randomUUID(), items: [item({ quantity })] })).toEqual(
      ['items'],
    );
  });

  it('rejects a non-uuid partSupplyId', async () => {
    expect(
      await invalidProperties({ quoteId: randomUUID(), items: [item({ partSupplyId: 'p-1' })] }),
    ).toEqual(['items']);
  });
});

describe('StockMessagingModule', () => {
  it('registers on init for inventory.stock.reserve', () => {
    const registry = new MessageHandlerRegistry();
    const reserve = new ReserveStockHandler({ execute: jest.fn() });
    const consume = new ConsumeReservedStockHandler({ execute: jest.fn() });

    new StockMessagingModule(registry, reserve, consume).onModuleInit();

    expect(registry.find('inventory.stock.reserve')).toEqual({
      handler: reserve.handle,
      payloadClass: ReserveStockPayload,
    });
  });

  it('registers on init for inventory.stock.consume', () => {
    const registry = new MessageHandlerRegistry();
    const reserve = new ReserveStockHandler({ execute: jest.fn() });
    const consume = new ConsumeReservedStockHandler({ execute: jest.fn() });

    new StockMessagingModule(registry, reserve, consume).onModuleInit();

    expect(registry.find('inventory.stock.consume')).toEqual({
      handler: consume.handle,
      payloadClass: ConsumeReservedStockPayload,
    });
  });
});
