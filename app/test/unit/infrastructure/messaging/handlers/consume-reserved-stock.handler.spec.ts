import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { MessageEnvelope } from '@application/messaging/message-envelope';
import { IConsumeReservedStockUseCase } from '@application/ports/input/stock/consume-reserved-stock.use-case.interface';
import { ConsumeReservedStockHandler } from '@infrastructure/messaging/handlers/consume-reserved-stock.handler';
import { ConsumeReservedStockPayload } from '@infrastructure/messaging/handlers/consume-reserved-stock.payload';

describe('ConsumeReservedStockHandler', () => {
  let useCase: jest.Mocked<IConsumeReservedStockUseCase>;
  let handler: ConsumeReservedStockHandler;

  function envelope(workOrderId: string | null): MessageEnvelope<'inventory.stock.consume'> {
    return {
      messageId: randomUUID(),
      type: 'inventory.stock.consume',
      occurredAt: new Date().toISOString(),
      workOrderId,
      payload: {},
    };
  }

  beforeEach(() => {
    useCase = { execute: jest.fn().mockResolvedValue({ consumedItemCount: 1 }) };
    handler = new ConsumeReservedStockHandler(useCase);
  });

  it('calls the use case with the envelope workOrderId', async () => {
    const workOrderId = randomUUID();

    await handler.handle(envelope(workOrderId));

    expect(useCase.execute).toHaveBeenCalledWith({ workOrderId });
  });

  it.each([null, ''])('fails without workOrderId in the envelope (%p)', async (missing) => {
    await expect(handler.handle(envelope(missing))).rejects.toThrow(
      'Comando de baixa sem o id da ordem de serviço',
    );

    expect(useCase.execute).not.toHaveBeenCalled();
  });
});

describe('ConsumeReservedStockPayload', () => {
  it('accepts an empty payload', async () => {
    const errors = await validate(plainToInstance(ConsumeReservedStockPayload, {}), {
      forbidUnknownValues: false,
    });

    expect(errors).toEqual([]);
  });
});
