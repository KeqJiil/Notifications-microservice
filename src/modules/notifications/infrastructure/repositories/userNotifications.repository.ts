import { Kysely } from 'kysely';
import { DB } from '@/infrastructure/database/types';
import { IUserNotificationsRepository } from '@modules/notifications/application/abstractions/userNotifications/UserNotificationsRepository.interface';
import { UserNotification } from '@modules/notifications/domain/aggregate/UserNotification';
import { UserId } from '@modules/notifications/domain/TypedId/UserId';
import { KyselyTransactionContext } from '@modules/notifications/infrastructure/repositories/kyselyTransactionContext';
import { UserNotificationMapper } from '@modules/notifications/infrastructure/repositories/userNotifications.mapper';

export class UserNotificationsRepository implements IUserNotificationsRepository {
  constructor(
    private readonly db: Kysely<DB>,
    private readonly context: KyselyTransactionContext,
  ) {}

  private get tx() {
    return this.context.getActiveTransaction() ?? this.db;
  }

  async findById(id: UserId): Promise<UserNotification | null> {
    const row = await this.tx
      .selectFrom('user_notifications')
      .selectAll()
      .where('user_id', '=', id.toString())
      .executeTakeFirst();

    return row ? UserNotificationMapper.toDomain(row) : null;
  }

  async save(aggregate: UserNotification): Promise<void> {
    const row = UserNotificationMapper.toPersistence(aggregate);
    await this.tx
      .insertInto('user_notifications')
      .values(row)
      .onConflict((oc) => oc.column('user_id').doUpdateSet(row))
      .execute();
  }
}
