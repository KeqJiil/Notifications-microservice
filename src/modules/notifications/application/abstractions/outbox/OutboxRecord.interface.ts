import {
  AccountCreatedPayload,
  EventType,
  IChannelTypes,
  ReservationPayload,
} from '@modules/notifications/application/abstractions/incomingQueueTypes';

export type OutboxDefaultMessagePayload = {
  userId: string;
  channel: IChannelTypes;
  type: EventType;
  message: string;
};

export type OutboxPayload =
  | OutboxDefaultMessagePayload
  | AccountCreatedPayload
  | ReservationPayload;

export interface OutboxRecord {
  id: string;
  eventId: string;
  payload: OutboxPayload;
  retries: number;
  createdAt: Date;
}
