import { EventType } from '@modules/notifications/application/abstractions/incomingQueueTypes';

export interface IOutboxHandler<T> {
  handle(eventId: string, type: EventType, payload: T): Promise<void>;
}
