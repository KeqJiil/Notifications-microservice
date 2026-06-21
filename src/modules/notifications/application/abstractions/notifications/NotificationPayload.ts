import { AccountCreatedPayload, EventType } from '@modules/notifications/application/abstractions/incomingQueueTypes';

export type NotificationPayload =
  | { kind: 'message'; type: EventType; message: string }
  | { kind: 'accountCreated'; type: EventType; data: AccountCreatedPayload };

export type NotificationPayloadOfKind<K extends NotificationPayload['kind']> = Extract<
  NotificationPayload,
  { kind: K }
>;
