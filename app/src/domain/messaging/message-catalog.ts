import { InventoryMessagePayloads } from './inventory.messages';

export type MessagePayloads = InventoryMessagePayloads;

export type MessageType = keyof MessagePayloads;

export type OutboxMessage = {
  [T in MessageType]: { type: T; workOrderId: string | null; payload: MessagePayloads[T] };
}[MessageType];
