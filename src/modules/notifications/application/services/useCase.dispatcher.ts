import { OutboxRecord } from '@modules/notifications/application/abstractions/outbox/OutboxRecord.interface';
import { EventType } from '@modules/notifications/application/abstractions/incomingQueueTypes';

type IUseCase = (payload: OutboxRecord) => Promise<void>;

export class UseCaseDispatcher {
  private useCaseMap: Map<EventType, IUseCase>;

  register(type: EventType, useCase: IUseCase): void {
    const existingHandler = this.useCaseMap.get(type);
    if (existingHandler) return;
    this.useCaseMap.set(type, useCase);
  }

  async handle(type: EventType, payload: OutboxRecord): Promise<void> {
    const handler = this.useCaseMap.get(type);
    if (!handler) return;
    await handler(payload);
  }
}
