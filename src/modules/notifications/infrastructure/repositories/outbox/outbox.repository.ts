import { Kysely, sql } from 'kysely';
import { IOutboxRepository } from '@modules/notifications/application/abstractions/outbox/OutboxRepository.interface';
import { DB } from '@/infrastructure/database/types';
import {
  OutboxPayload,
  OutboxRecord,
} from '@modules/notifications/application/abstractions/outbox/OutboxRecord.interface';
import { KyselyTransactionContext } from '@modules/notifications/infrastructure/repositories/kyselyTransactionContext';
import { OUTBOX_LEASE_MS } from '@/common/consts/outboxConsts';

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
    const leaseUntil = new Date(Date.now() + OUTBOX_LEASE_MS);

    const claimed = await this.tx
      .updateTable('outbox')
      .set({ next_attempt_at: leaseUntil })
      .where('id', 'in', (eb) =>
        eb
          .selectFrom('outbox')
          .select('id')
          .where((eb2) =>
            eb2.and([
              eb2('status', '=', 'PENDING'),
              eb2('next_attempt_at', '<', sql<Date>`NOW()`),
            ]),
          )
          .orderBy('next_attempt_at', 'asc')
          .limit(limit)
          .forUpdate()
          .skipLocked(),
      )
      .returning(['id', 'event_id', 'payload', 'retries', 'created_at'])
      .execute();

    return claimed.map((row) => ({
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
      .set({ status: 'SUCCESS' })
      .where('id', '=', id)
      .execute();
  }

  async retry(id: string, nextAttemptAt: Date): Promise<void> {
    await this.tx
      .updateTable('outbox')
      .set((eb) => ({
        next_attempt_at: nextAttemptAt,
        retries: eb('retries', '+', 1),
      }))
      .where('id', '=', id)
      .execute();
  }

  async markDead(id: string): Promise<void> {
    await this.tx
      .updateTable('outbox')
      .set(() => ({ status: 'DEAD' }))
      .where('id', '=', id)
      .execute();
  }
}
