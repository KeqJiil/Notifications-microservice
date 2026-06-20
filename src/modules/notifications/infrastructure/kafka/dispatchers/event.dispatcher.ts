import {
  Event,
  EventType,
} from '@modules/notifications/application/abstractions/incomingQueueTypes';

export type Handler = (payload: Event) => Promise<void>;

export class EventDispatcher {
  private eventMap = new Map<EventType, Handler>();

  public register(type: EventType, handler: Handler): void {
    const existingHandler = this.eventMap.get(type);
    if (existingHandler) return;
    this.eventMap.set(type, handler);
  }

  public async process(event: EventType, payload: Event): Promise<void> {
    const handler = this.eventMap.get(event);
    if (!handler) return;
    await handler(payload);
  }
}
