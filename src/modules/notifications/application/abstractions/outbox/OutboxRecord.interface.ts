import {
  AccountCreatedPayload,
  DualRecipientPayload,
  ReservationPayload,
  SingleRecipientPayload,
} from '@modules/notifications/application/abstractions/incomingQueueTypes';

export type OutboxPayload =
  | SingleRecipientPayload
  | DualRecipientPayload
  | ReservationPayload
  | AccountCreatedPayload;

export interface OutboxRecord {
  id: string;
  eventId: string;
  payload: OutboxPayload;
  retries: number;
  createdAt: Date;
}
