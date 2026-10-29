import { randomUUID } from 'node:crypto';
import { context, propagation, SpanContext, SpanKind, trace } from '@opentelemetry/api';
import {
  InMemorySpanExporter,
  NodeTracerProvider,
  SimpleSpanProcessor,
} from '@opentelemetry/sdk-trace-node';
import {
  DeleteMessageCommand,
  GetQueueAttributesCommand,
  GetQueueUrlCommand,
  Message,
  MessageAttributeValue,
  ReceiveMessageCommand,
  SendMessageCommand,
  SetQueueAttributesCommand,
  SQSClient,
} from '@aws-sdk/client-sqs';
import { IsArray, IsUUID } from 'class-validator';

import { MessageEnvelope } from '@application/messaging/message-envelope';
import { DECLARED_FIELD_NAMES } from '@infrastructure/logging/field-registry';
import { MessageHandlerRegistry } from '@infrastructure/messaging/message-handler.registry';
import { MAX_RECEIVE_COUNT } from '@infrastructure/messaging/sqs-consumer.service';
import { TestContext, setupTestApp, teardownTestApp } from '../helpers/test-app.helper';

// The consumer long polls for 20 s and LocalStack does not always wake that poll when a message
// becomes visible again, so the 5 deliveries up to the redrive can take about 20 s each.
const DEAD_LETTER_TIMEOUT_MS = 120_000;
const TRACE_ID = '0af7651916cd43dd8448eb211c80319c';
const PARENT_SPAN_ID = 'b7ad6b7169203331';

class StockReservePayload {
  @IsUUID('4')
  quoteId!: string;

  @IsArray()
  items!: unknown[];
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

// The service registers no handler yet (C-15 does). The suite registers one test handler for
// inventory.stock.reserve, routed by work order id, to prove processing, ack and FIFO order; every
// other type has no handler and must stay in the queue until the redrive moves it to the DLQ.
// Messages go straight to inventory.fifo (not through the topic), each test with its own group, so
// a message held in one FIFO group never blocks another test.
describe('Messaging (E2E)', () => {
  const HANDLED_TYPE = 'inventory.stock.reserve';
  const UNHANDLED_TYPE = 'inventory.stock.consume';

  const spanExporter = new InMemorySpanExporter();
  const tracerProvider = new NodeTracerProvider({
    spanProcessors: [new SimpleSpanProcessor(spanExporter)],
  });
  const handlers = new Map<string, (envelope: MessageEnvelope<typeof HANDLED_TYPE>) => void>();

  let ctx: TestContext;
  let sqs: SQSClient;
  let queueUrl: string;
  let dlqUrl: string;
  const deadLettered: Message[] = [];

  beforeAll(async () => {
    // Registers the W3C propagator and the async context manager, as the preload does at runtime.
    tracerProvider.register();

    ctx = await setupTestApp({ withMessaging: true, captureLogs: true });
    sqs = ctx.app.get(SQSClient);

    ctx.app.get(MessageHandlerRegistry).register(
      HANDLED_TYPE,
      (envelope) => {
        handlers.get(envelope.workOrderId as string)?.(envelope);
        return Promise.resolve();
      },
      StockReservePayload,
    );

    const queue = await sqs.send(new GetQueueUrlCommand({ QueueName: 'inventory.fifo' }));
    queueUrl = queue.QueueUrl as string;
    const dlq = await sqs.send(new GetQueueUrlCommand({ QueueName: 'inventory-dlq.fifo' }));
    dlqUrl = dlq.QueueUrl as string;

    // A delivery that is not acknowledged comes back in 1 s instead of 30 s.
    await sqs.send(
      new SetQueueAttributesCommand({ QueueUrl: queueUrl, Attributes: { VisibilityTimeout: '1' } }),
    );
  });

  afterAll(async () => {
    await teardownTestApp(ctx);
    await tracerProvider.shutdown();
    trace.disable();
    context.disable();
    propagation.disable();
  });

  async function send(
    body: string,
    groupId: string = randomUUID(),
    attributes?: Record<string, MessageAttributeValue>,
  ): Promise<string> {
    const { MessageId } = await sqs.send(
      new SendMessageCommand({
        QueueUrl: queueUrl,
        MessageBody: body,
        MessageGroupId: groupId,
        MessageDeduplicationId: randomUUID(),
        MessageAttributes: attributes,
      }),
    );

    return MessageId as string;
  }

  function envelope(fields: Record<string, unknown> = {}): Record<string, unknown> {
    return {
      messageId: randomUUID(),
      type: UNHANDLED_TYPE,
      occurredAt: new Date().toISOString(),
      workOrderId: randomUUID(),
      payload: {},
      ...fields,
    };
  }

  function reserve(workOrderId: string): Record<string, unknown> {
    return envelope({
      type: HANDLED_TYPE,
      workOrderId,
      payload: { quoteId: randomUUID(), items: [] },
    });
  }

  function eventLines(event: string, messageId: string): Record<string, unknown>[] {
    return ctx
      .logCapture!.lines()
      .filter(
        (line) =>
          line['oficina.event.name'] === event && line['messaging.message.id'] === messageId,
      );
  }

  async function queueIsEmpty(): Promise<boolean> {
    const { Attributes } = await sqs.send(
      new GetQueueAttributesCommand({
        QueueUrl: queueUrl,
        AttributeNames: ['ApproximateNumberOfMessages', 'ApproximateNumberOfMessagesNotVisible'],
      }),
    );

    return (
      Attributes?.ApproximateNumberOfMessages === '0' &&
      Attributes?.ApproximateNumberOfMessagesNotVisible === '0'
    );
  }

  async function waitForDeadLettered(sqsMessageId: string): Promise<Message> {
    const find = () => deadLettered.find((message) => message.MessageId === sqsMessageId);

    await waitFor(
      async () => {
        const { Messages = [] } = await sqs.send(
          new ReceiveMessageCommand({
            QueueUrl: dlqUrl,
            MaxNumberOfMessages: 10,
            WaitTimeSeconds: 1,
          }),
        );

        for (const message of Messages) {
          deadLettered.push(message);
          await sqs.send(
            new DeleteMessageCommand({ QueueUrl: dlqUrl, ReceiptHandle: message.ReceiptHandle }),
          );
        }

        return find() !== undefined;
      },
      `message ${sqsMessageId} in inventory-dlq.fifo`,
      DEAD_LETTER_TIMEOUT_MS,
    );

    return find() as Message;
  }

  // Runs first, while the queue holds no other message, so an empty queue means this one was deleted.
  it('processes a valid message, acks it and continues the trace', async () => {
    const workOrderId = randomUUID();
    const message = reserve(workOrderId);
    const calls: { envelope: MessageEnvelope; span?: SpanContext }[] = [];
    handlers.set(workOrderId, (received) =>
      calls.push({ envelope: received, span: trace.getActiveSpan()?.spanContext() }),
    );

    await send(JSON.stringify(message), workOrderId, {
      traceparent: { DataType: 'String', StringValue: `00-${TRACE_ID}-${PARENT_SPAN_ID}-01` },
    });

    await waitFor(() => calls.length === 1, 'test handler called');
    await waitFor(queueIsEmpty, 'message deleted from inventory.fifo', 15_000);
    // Not acknowledged, it would come back after the 1 s visibility timeout.
    await new Promise((resolve) => setTimeout(resolve, 3_000));

    expect(calls).toHaveLength(1);
    expect(calls[0].envelope).toEqual(message);

    const consumeSpan = spanExporter
      .getFinishedSpans()
      .find((span) => span.spanContext().spanId === calls[0].span?.spanId);
    expect(consumeSpan).toMatchObject({ name: 'process inventory.fifo', kind: SpanKind.CONSUMER });
    expect(consumeSpan?.spanContext().traceId).toBe(TRACE_ID);
    expect(consumeSpan?.parentSpanContext?.spanId).toBe(PARENT_SPAN_ID);
  });

  it('holds the group until the first message is processed or dead-lettered', async () => {
    const workOrderId = randomUUID();
    const first = reserve(workOrderId);
    const second = reserve(workOrderId);
    const seen: string[] = [];
    handlers.set(workOrderId, ({ messageId }) => {
      seen.push(messageId === first.messageId ? 'first' : 'second');

      if (messageId === first.messageId) {
        throw new Error('the first message always fails');
      }
    });

    const firstSqsId = await send(JSON.stringify(first), workOrderId);
    await send(JSON.stringify(second), workOrderId);

    await waitFor(
      () => seen.includes('second'),
      'second message processed',
      DEAD_LETTER_TIMEOUT_MS,
    );

    expect(seen).toEqual([...Array<string>(MAX_RECEIVE_COUNT).fill('first'), 'second']);
    expect(JSON.parse((await waitForDeadLettered(firstSqsId)).Body as string)).toEqual(first);
  });

  it('logs and does not ack a valid message of a type without handler', async () => {
    const message = envelope();
    const messageId = message.messageId as string;
    const sqsMessageId = await send(JSON.stringify(message));

    const inDlq = await waitForDeadLettered(sqsMessageId);

    // Deliveries 1 to 4 log unhandled; the last one logs dead_lettered before the redrive.
    const unhandled = eventLines('messaging.message.unhandled', messageId);
    expect(unhandled).toHaveLength(MAX_RECEIVE_COUNT - 1);
    expect(unhandled[0]).toMatchObject({
      level: 'warn',
      'messaging.destination.name': 'inventory.fifo',
      'oficina.messaging.message.type': UNHANDLED_TYPE,
    });
    expect(eventLines('messaging.message.dead_lettered', messageId)).toHaveLength(1);
    expect(JSON.parse(inDlq.Body as string)).toEqual(message);
  });

  it('does not ack an invalid envelope and keeps consuming', async () => {
    const notJson = await send('{not json');
    const withoutMessageIdBody = JSON.stringify(envelope({ messageId: undefined }));
    const withoutMessageId = await send(withoutMessageIdBody);

    // Each invalid message is delivered again, so it was not acknowledged.
    await waitFor(
      () =>
        eventLines('messaging.message.failed', notJson).length >= 2 &&
        eventLines('messaging.message.failed', withoutMessageId).length >= 2,
      'invalid envelopes delivered twice',
    );

    const valid = envelope();
    await send(JSON.stringify(valid));

    await waitFor(
      () => eventLines('messaging.message.unhandled', valid.messageId as string).length >= 1,
      'valid message consumed after the invalid ones',
    );

    expect((await waitForDeadLettered(notJson)).Body).toBe('{not json');
    expect((await waitForDeadLettered(withoutMessageId)).Body).toBe(withoutMessageIdBody);
    expect(eventLines('messaging.message.dead_lettered', notJson)).toHaveLength(1);
    expect(eventLines('messaging.message.dead_lettered', withoutMessageId)).toHaveLength(1);
  });

  it('emits only declared fields on messaging lines', async () => {
    // Its own failing message, so the check has messaging lines even when it runs alone.
    const sqsMessageId = await send('{not json');
    await waitFor(
      () => eventLines('messaging.message.failed', sqsMessageId).length >= 1,
      'messaging line logged',
    );

    const messagingLines = ctx
      .logCapture!.lines()
      .filter((line) => Object.keys(line).some((key) => key.startsWith('messaging.')));

    expect(
      messagingLines
        .flatMap((line) => Object.keys(line))
        .filter((key) => !DECLARED_FIELD_NAMES.has(key)),
    ).toEqual([]);
  });
});
