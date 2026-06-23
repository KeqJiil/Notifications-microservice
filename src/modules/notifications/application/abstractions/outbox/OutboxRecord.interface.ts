import {
  AccountCreatedPayload,
  EventType,
  IChannelTypes,
} from '@modules/notifications/application/abstractions/incomingQueueTypes';

export type OutboxDefaultMessagePayload = {
  userId: string;
  channel: IChannelTypes;
  type: EventType;
  message: string;
};

export type OutboxPayload = OutboxDefaultMessagePayload | AccountCreatedPayload;

export interface OutboxRecord<T extends OutboxPayload = OutboxPayload> {
  id: string;
  eventId: string;
  payload: T;
  retries: number;
  createdAt: Date;
}
