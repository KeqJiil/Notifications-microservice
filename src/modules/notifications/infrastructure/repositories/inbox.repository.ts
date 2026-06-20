import { Kysely, sql } from 'kysely';
import { IInboxRepository } from '@modules/notifications/application/abstractions/inbox/InboxRepository.interface';
import { IInboxRecord } from '@modules/notifications/application/abstractions/inbox/InboxRecord.interface';
import { DB } from '@/infrastructure/database/types';
import { KyselyTransactionContext } from '@modules/notifications/infrastructure/repositories/kyselyTransactionContext';

export class InboxRepository implements IInboxRepository {
  constructor(
    private readonly db: Kysely<DB>,
    private readonly context: KyselyTransactionContext,
  ) {}

  private get tx() {
    return this.context.getActiveTransaction() ?? this.db;
  }

  async insert(id: string): Promise<void> {
    await this.tx
      .insertInto('inbox')
      .values({ event_id: id })
      .onConflict((oc) => oc.column('event_id').doNothing())
      .execute();
  }

  async changeStage(id: string, stage: string): Promise<void> {
    await this.tx
      .updateTable('inbox')
      .set({ stage })
      .where('event_id', '=', id)
      .execute();
  }

  async markSuccess(id: string): Promise<void> {
    await this.tx
      .updateTable('inbox')
      .set({ success: true, processed_at: sql`NOW()` })
      .where('event_id', '=', id)
      .execute();
  }

  async get(id: string): Promise<IInboxRecord | null> {
    const row = await this.tx
      .selectFrom('inbox')
      .select(['event_id', 'success', 'stage', 'processed_at', 'created_at'])
      .where('event_id', '=', id)
      .executeTakeFirst();

    if (!row) return null;

    return {
      id: row.event_id,
      success: row.success,
      stage: row.stage,
      processedAt: row.processed_at,
      createdAt: row.created_at,
    };
  }
}
