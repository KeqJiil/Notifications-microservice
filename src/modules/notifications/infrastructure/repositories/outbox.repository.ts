import { Kysely, sql } from 'kysely';
import { IOutboxRepository } from '@modules/notifications/application/abstractions/outbox/OutboxRepository.interface';
import { DB } from '@/infrastructure/database/types';
import {
  OutboxPayload,
  OutboxRecord,
} from '@modules/notifications/application/abstractions/outbox/OutboxRecord.interface';
import { KyselyTransactionContext } from '@modules/notifications/infrastructure/repositories/kyselyTransactionContext';

export class OutboxRepository implements IOutboxRepository {
  constructor(
    private readonly db: Kysely<DB>,
    private readonly context: KyselyTransactionContext,
  ) {}

  private get tx() {
    return this.context.getActiveTransaction() ?? this.db;
  }

  async insert(eventId: string, payload: OutboxPayload): Promise<void> {
    await this.tx
      .insertInto('outbox')
      .values({
        event_id: eventId,
        payload: JSON.stringify(payload),
        next_attempt_at: sql`NOW()`,
      })
      .onConflict((oc) => oc.column('event_id').doNothing())
      .execute();
  }

  async claimBatch(limit: number = 50): Promise<OutboxRecord[]> {
    const batch = await this.tx
      .selectFrom('outbox')
      .select(['id', 'event_id', 'payload', 'retries', 'created_at'])
      .where((eb) =>
        eb.and([
          eb('success', '=', false),
          eb('next_attempt_at', '<', sql<Date>`NOW()`),
        ]),
      )
      .limit(limit)
      .forUpdate()
      .skipLocked()
      .execute();
    return batch.map((row) => ({
      id: row.id,
      eventId: row.event_id,
      payload: row.payload as unknown as OutboxPayload,
      retries: row.retries ?? 0,
      createdAt: row.created_at,
    }));
  }

  async markSucceed(id: string): Promise<void> {
    await this.tx
      .updateTable('outbox')
      .set({ success: true })
      .where('id', '=', id)
      .execute();
  }

  async markFailed(id: string, nextAttemptAt: Date): Promise<void> {
    await this.tx
      .updateTable('outbox')
      .set((eb) => ({
        next_attempt_at: nextAttemptAt,
        retries: eb('retries', '+', 1),
      }))
      .where('id', '=', id)
      .execute();
  }
}
