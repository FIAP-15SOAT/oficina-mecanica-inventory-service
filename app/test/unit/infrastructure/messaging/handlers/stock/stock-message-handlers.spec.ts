import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { IConsumeReservedStockUseCase } from '@application/ports/input/stock/consume-reserved-stock.use-case.interface';
import { IReserveStockUseCase } from '@application/ports/input/stock/reserve-stock.use-case.interface';
import { ConsumeReservedStockPayloadDto } from '@infrastructure/messaging/handlers/stock/dto/consume-reserved-stock-payload.dto';
import { ReserveStockPayloadDto } from '@infrastructure/messaging/handlers/stock/dto/reserve-stock-payload.dto';
import { StockMessageHandlers } from '@infrastructure/messaging/handlers/stock/stock-message-handlers';
import { MessageHandlerRegistry } from '@infrastructure/messaging/message-handler.registry';

describe('StockMessageHandlers', () => {
  const payload = {
    quoteId: randomUUID(),
    items: [{ partSupplyId: randomUUID(), quantity: 2 }],
  };

  let handlers: StockMessageHandlers;
  let registry: MessageHandlerRegistry;
  let reserveStockUseCase: jest.Mocked<IReserveStockUseCase>;
  let consumeReservedStockUseCase: jest.Mocked<IConsumeReservedStockUseCase>;

  beforeEach(() => {
    registry = new MessageHandlerRegistry();

    reserveStockUseCase = { execute: jest.fn().mockResolvedValue(undefined) };

    consumeReservedStockUseCase = { execute: jest.fn().mockResolvedValue(undefined) };

    handlers = new StockMessageHandlers(registry, reserveStockUseCase, consumeReservedStockUseCase);
    handlers.onModuleInit();
  });

  it('should register the reserve command with its payload class', () => {
    expect(registry.find('inventory.stock.reserve')?.payloadClass).toBe(ReserveStockPayloadDto);
  });

  it('should reserve with the work order from the envelope and the quote from the payload', async () => {
    const workOrderId = randomUUID();

    await registry.find('inventory.stock.reserve')?.handler({
      messageId: randomUUID(),
      type: 'inventory.stock.reserve',
      occurredAt: new Date().toISOString(),
      workOrderId,
      payload,
    });

    expect(reserveStockUseCase.execute).toHaveBeenCalledWith({
      workOrderId,
      quoteId: payload.quoteId,
      items: payload.items,
    });
  });

  it('should fail the reserve command without workOrderId in the envelope', async () => {
    const execution = registry.find('inventory.stock.reserve')?.handler({
      messageId: randomUUID(),
      type: 'inventory.stock.reserve',
      occurredAt: new Date().toISOString(),
      workOrderId: null,
      payload,
    });

    await expect(execution).rejects.toThrow('Comando de reserva sem o id da ordem de serviço');
    expect(reserveStockUseCase.execute).not.toHaveBeenCalled();
  });

  it('should register the consume command with its payload class', () => {
    expect(registry.find('inventory.stock.consume')?.payloadClass).toBe(
      ConsumeReservedStockPayloadDto,
    );
  });

  it('should consume with the work order from the envelope', async () => {
    const workOrderId = randomUUID();

    await registry.find('inventory.stock.consume')?.handler({
      messageId: randomUUID(),
      type: 'inventory.stock.consume',
      occurredAt: new Date().toISOString(),
      workOrderId,
      payload: {},
    });

    expect(consumeReservedStockUseCase.execute).toHaveBeenCalledWith(workOrderId);
  });

  it.each([null, ''])(
    'should fail the consume command without workOrderId in the envelope (%p)',
    async (missing) => {
      const execution = registry.find('inventory.stock.consume')?.handler({
        messageId: randomUUID(),
        type: 'inventory.stock.consume',
        occurredAt: new Date().toISOString(),
        workOrderId: missing,
        payload: {},
      });

      await expect(execution).rejects.toThrow('Comando de baixa sem o id da ordem de serviço');
      expect(consumeReservedStockUseCase.execute).not.toHaveBeenCalled();
    },
  );
});

describe('ReserveStockPayloadDto', () => {
  async function invalidProperties(plain: object): Promise<string[]> {
    const errors = await validate(plainToInstance(ReserveStockPayloadDto, plain));

    return errors.map((error) => error.property);
  }

  function item(fields: Record<string, unknown> = {}): Record<string, unknown> {
    return { partSupplyId: randomUUID(), quantity: 1, ...fields };
  }

  it('should accept a valid payload', async () => {
    expect(await invalidProperties({ quoteId: randomUUID(), items: [item(), item()] })).toEqual([]);
  });

  it('should reject a non-uuid quoteId', async () => {
    expect(await invalidProperties({ quoteId: 'quote-1', items: [item()] })).toEqual(['quoteId']);
  });

  it('should reject empty items', async () => {
    expect(await invalidProperties({ quoteId: randomUUID(), items: [] })).toEqual(['items']);
  });

  it('should reject items that are not an array', async () => {
    expect(await invalidProperties({ quoteId: randomUUID(), items: item() })).toEqual(['items']);
  });

  it.each([0, -1, 1.5, '2'])('should reject quantity zero or fractional (%p)', async (quantity) => {
    expect(await invalidProperties({ quoteId: randomUUID(), items: [item({ quantity })] })).toEqual(
      ['items'],
    );
  });

  it('should reject a non-uuid partSupplyId', async () => {
    expect(
      await invalidProperties({ quoteId: randomUUID(), items: [item({ partSupplyId: 'p-1' })] }),
    ).toEqual(['items']);
  });
});

describe('ConsumeReservedStockPayloadDto', () => {
  it('should accept an empty payload', async () => {
    const errors = await validate(plainToInstance(ConsumeReservedStockPayloadDto, {}), {
      forbidUnknownValues: false,
    });

    expect(errors).toEqual([]);
  });
});
