import {
  OutboxPayload,
  OutboxRecord,
} from '@modules/notifications/application/abstractions/outbox/OutboxRecord.interface';

export interface IOutboxRepository {
  insert(eventId: string, payload: OutboxPayload): Promise<void>;
  claimBatch(limit?: number): Promise<OutboxRecord[]>;
  markSucceed(id: string): Promise<void>;
  markFailed(id: string, nextAttemptAt: Date): Promise<void>;
}
