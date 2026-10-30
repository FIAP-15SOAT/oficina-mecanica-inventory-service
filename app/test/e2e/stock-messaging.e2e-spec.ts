import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { PublishCommand, SNSClient } from '@aws-sdk/client-sns';
import {
  DeleteMessageBatchCommand,
  GetQueueUrlCommand,
  ReceiveMessageCommand,
  SQSClient,
} from '@aws-sdk/client-sqs';

import { cleanDatabase } from '../helpers/db-cleanup.helper';
import { TestContext, setupTestApp, teardownTestApp } from '../helpers/test-app.helper';

const TOPIC_ARN = 'arn:aws:sns:us-east-1:000000000000:oficina-events.fifo';

interface Reply {
  messageId: string;
  type: string;
  workOrderId: string;
  payload: Record<string, unknown>;
}

async function waitFor(
  condition: () => boolean | Promise<boolean>,
  description: string,
  timeoutMs = 45_000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;

  while (!(await condition())) {
    if (Date.now() > deadline) {
      throw new Error(`${description}: condition not met within ${timeoutMs} ms`);
    }

    await new Promise((resolve) => setTimeout(resolve, 200));
  }
}

// Commands go through the topic, as the work order does; the real handlers, outbox relay and
// consumer run, and the replies are read from work-order.fifo. Every test uses its own work order
// id (the FIFO group), so tests never block each other.
describe('Stock messaging (E2E)', () => {
  let ctx: TestContext;
  let sns: SNSClient;
  let sqs: SQSClient;
  let replyQueueUrl: string;
  const replies: Reply[] = [];

  beforeAll(async () => {
    ctx = await setupTestApp({ withMessaging: true });
    sns = ctx.app.get(SNSClient);
    sqs = ctx.app.get(SQSClient);

    replyQueueUrl = (await sqs.send(new GetQueueUrlCommand({ QueueName: 'work-order.fifo' })))
      .QueueUrl as string;
  });

  afterAll(async () => {
    await teardownTestApp(ctx);
  });

  beforeEach(async () => {
    await cleanDatabase(ctx.prisma);
  });

  async function insertPart(stock: number, reservedStock = 0): Promise<string> {
    const id = randomUUID();

    await ctx.prisma.$executeRaw`
      INSERT INTO parts_supplies (id, name, sku, category, cost_price, sale_price, stock, reserved_stock, updated_at)
      VALUES (${id}::uuid, 'Oil filter', ${randomUUID().slice(0, 30)}, 'PART', 10, 20, ${stock}, ${reservedStock}, now())
    `;

    return id;
  }

  function part(id: string) {
    return ctx.prisma.partSupply.findUniqueOrThrow({ where: { id } });
  }

  async function publish(
    type: string,
    workOrderId: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    const messageId = randomUUID();

    await sns.send(
      new PublishCommand({
        TopicArn: TOPIC_ARN,
        Message: JSON.stringify({
          messageId,
          type,
          occurredAt: new Date().toISOString(),
          workOrderId,
          payload,
        }),
        MessageGroupId: workOrderId,
        MessageDeduplicationId: messageId,
        MessageAttributes: { type: { DataType: 'String', StringValue: type } },
      }),
    );
  }

  async function drainReplies(): Promise<void> {
    const { Messages = [] } = await sqs.send(
      new ReceiveMessageCommand({
        QueueUrl: replyQueueUrl,
        MaxNumberOfMessages: 10,
        WaitTimeSeconds: 1,
      }),
    );

    if (Messages.length === 0) {
      return;
    }

    for (const message of Messages) {
      replies.push(JSON.parse(message.Body as string) as Reply);
    }

    await sqs.send(
      new DeleteMessageBatchCommand({
        QueueUrl: replyQueueUrl,
        Entries: Messages.map((message, index) => ({
          Id: String(index),
          ReceiptHandle: message.ReceiptHandle,
        })),
      }),
    );
  }

  async function repliesFor(workOrderId: string, count: number): Promise<Reply[]> {
    const matching = () => replies.filter((reply) => reply.workOrderId === workOrderId);

    await waitFor(async () => {
      await drainReplies();

      return matching().length >= count;
    }, `${count} replies for ${workOrderId}`);

    return matching();
  }

  it('reserves stock and replies inventory.stock.reserved with the quote id', async () => {
    const partId = await insertPart(10, 1);
    const workOrderId = randomUUID();
    const quoteId = randomUUID();

    await publish('inventory.stock.reserve', workOrderId, {
      quoteId,
      items: [{ partSupplyId: partId, quantity: 3 }],
    });

    const [reply] = await repliesFor(workOrderId, 1);

    expect(reply.type).toBe('inventory.stock.reserved');
    expect(reply.payload).toEqual({ quoteId });
    expect((await part(partId)).reservedStock).toBe(4);
    expect(await ctx.prisma.stockReservation.findMany({ where: { workOrderId } })).toEqual([
      expect.objectContaining({ partSupplyId: partId, quantity: 3 }),
    ]);
  });

  it('keeps a single set of reservations and replies again when the command is repeated', async () => {
    const partId = await insertPart(10);
    const workOrderId = randomUUID();
    const quoteId = randomUUID();
    const items = [{ partSupplyId: partId, quantity: 2 }];

    await publish('inventory.stock.reserve', workOrderId, { quoteId, items });
    await repliesFor(workOrderId, 1);
    await publish('inventory.stock.reserve', workOrderId, { quoteId, items });

    const result = await repliesFor(workOrderId, 2);

    expect(result.map((reply) => reply.type)).toEqual([
      'inventory.stock.reserved',
      'inventory.stock.reserved',
    ]);
    expect(result[1].payload).toEqual({ quoteId });
    expect((await part(partId)).reservedStock).toBe(2);
    expect(await ctx.prisma.stockReservation.count({ where: { workOrderId } })).toBe(1);
  });

  it('replies inventory.stock.reservation_failed with the missing items and reserves nothing', async () => {
    const enough = await insertPart(10);
    const short = await insertPart(2, 1);
    const workOrderId = randomUUID();
    const quoteId = randomUUID();

    await publish('inventory.stock.reserve', workOrderId, {
      quoteId,
      items: [
        { partSupplyId: enough, quantity: 1 },
        { partSupplyId: short, quantity: 2 },
      ],
    });

    const [reply] = await repliesFor(workOrderId, 1);

    expect(reply.type).toBe('inventory.stock.reservation_failed');
    expect(reply.payload).toEqual({
      quoteId,
      missing: [{ partSupplyId: short, requested: 2, available: 1 }],
    });
    expect((await part(enough)).reservedStock).toBe(0);
    expect((await part(short)).reservedStock).toBe(1);
    expect(await ctx.prisma.stockReservation.count({ where: { workOrderId } })).toBe(0);
  });

  it('consumes the reservations into EXIT movements and ignores a repeated command', async () => {
    const partId = await insertPart(10);
    const workOrderId = randomUUID();

    await publish('inventory.stock.reserve', workOrderId, {
      quoteId: randomUUID(),
      items: [{ partSupplyId: partId, quantity: 4 }],
    });
    await repliesFor(workOrderId, 1);

    await publish('inventory.stock.consume', workOrderId, {});
    await waitFor(
      async () =>
        (await ctx.prisma.stockMovement.count({ where: { workOrderId } })) === 1 &&
        (await ctx.prisma.stockReservation.count({ where: { workOrderId } })) === 0,
      'EXIT movement written and reservations deleted',
    );

    expect(await ctx.prisma.stockMovement.findMany({ where: { workOrderId } })).toEqual([
      expect.objectContaining({ partSupplyId: partId, type: 'EXIT', quantity: 4 }),
    ]);
    expect(await ctx.prisma.stockReservation.count({ where: { workOrderId } })).toBe(0);
    expect(await part(partId)).toEqual(expect.objectContaining({ stock: 6, reservedStock: 0 }));

    // The sentinel reserve shares the FIFO group, so its reply proves the repeated consume ran first.
    const sentinelPartId = await insertPart(5);
    await publish('inventory.stock.consume', workOrderId, {});
    await publish('inventory.stock.reserve', workOrderId, {
      quoteId: randomUUID(),
      items: [{ partSupplyId: sentinelPartId, quantity: 1 }],
    });
    await repliesFor(workOrderId, 2);

    expect(await ctx.prisma.stockMovement.count({ where: { workOrderId } })).toBe(1);
    expect(await part(partId)).toEqual(expect.objectContaining({ stock: 6, reservedStock: 0 }));
  });

  it('serves the new reservedStock on the internal read after a reservation', async () => {
    const partId = await insertPart(10);
    const workOrderId = randomUUID();

    // Fills the cache with the balance before the reservation.
    const before = await request(ctx.httpServer).get(`/internal/parts-supplies/${partId}`);
    expect(before.status).toBe(200);
    expect(before.body.data.reservedStock).toBe(0);

    await publish('inventory.stock.reserve', workOrderId, {
      quoteId: randomUUID(),
      items: [{ partSupplyId: partId, quantity: 5 }],
    });
    await repliesFor(workOrderId, 1);

    const after = await request(ctx.httpServer).get(`/internal/parts-supplies/${partId}`);
    expect(after.status).toBe(200);
    expect(after.body.data.reservedStock).toBe(5);
  });
});
