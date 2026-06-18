import {
  KafkaEvent,
  KafkaEventType,
} from '@modules/notifications/infrastructure/kafka/types';

export type Handler = (payload: KafkaEvent) => Promise<void>;

export class EventDispatcher {
  private eventMap = new Map<KafkaEventType, Handler>();

  public register(type: KafkaEventType, handler: Handler): void {
    const existingHandler = this.eventMap.get(type);
    if (existingHandler) return;
    this.eventMap.set(type, handler);
  }

  public async process(
    event: KafkaEventType,
    payload: KafkaEvent,
  ): Promise<void> {
    const handler = this.eventMap.get(event);
    if (!handler) return;
    await handler(payload);
  }
}
