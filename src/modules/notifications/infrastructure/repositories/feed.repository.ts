import { Kysely, sql } from 'kysely';
import { DB } from '@/infrastructure/database/types';
import {
  IFeedCursor,
  IFeedFilter,
  IFeedPage,
  IFeedRepository,
} from '@modules/notifications/application/abstractions/feed/FeedRepository.interface';
import { IFeedRecord } from '@modules/notifications/application/abstractions/feed/FeedRecord.interface';
import { UserId } from '@modules/notifications/domain/TypedId/UserId';
import { KyselyTransactionContext } from '@modules/notifications/infrastructure/repositories/kyselyTransactionContext';
import { FEED_PAGE_SIZE } from '@/common/consts/feedConsts';
import { NotificationPayload } from '@modules/notifications/application/abstractions/notifications/NotificationPayload';

export class FeedRepository implements IFeedRepository {
  constructor(
    private readonly db: Kysely<DB>,
    private readonly context: KyselyTransactionContext,
  ) {}

  private get tx() {
    return this.context.getActiveTransaction() ?? this.db;
  }

  async insert(record: {
    idempotencyKey: string;
    userId: UserId;
    payload: unknown;
    createdAt: Date;
  }): Promise<void> {
    await this.tx
      .insertInto('notifications')
      .values({
        idempotency_key: record.idempotencyKey,
        user_id: record.userId.toString(),
        payload: JSON.stringify(record.payload),
      })
      .onConflict((oc) => oc.column('idempotency_key').doNothing())
      .execute();
  }

  async getAll(
    userId: string,
    cursor?: IFeedCursor,
    filter?: IFeedFilter,
  ): Promise<IFeedPage> {
    let query = this.tx
      .selectFrom('notifications')
      .selectAll()
      .where('user_id', '=', userId)
      .orderBy('created_at', 'desc')
      .orderBy('id', 'desc')
      .limit(FEED_PAGE_SIZE + 1);

    if (cursor) {
      query = query.where(
        sql<boolean>`(created_at, id) < (${cursor.createdAt}, ${cursor.id})`,
      );
    }

    if (filter?.isRead !== undefined) {
      query = query.where('is_read', '=', filter.isRead);
    }

    const rows = await query.execute();
    const hasPreviousPage = rows.length > FEED_PAGE_SIZE;
    const items: IFeedRecord[] = rows.slice(0, FEED_PAGE_SIZE).map((row) => ({
      id: row.id,
      idempotencyKey: row.idempotency_key,
      userId: row.user_id,
      payload: row.payload as unknown as NotificationPayload,
      createdAt: row.created_at,
      isRead: row.is_read,
    }));

    return { items, hasPreviousPage };
  }

  async markAsRead(userId: UserId, ids: string[]): Promise<void> {
    if (ids.length === 0) return;

    await this.tx
      .updateTable('notifications')
      .set({ is_read: true })
      .where('user_id', '=', userId.toString())
      .where('id', 'in', ids)
      .execute();
  }
}
