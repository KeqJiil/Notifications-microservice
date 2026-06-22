import { Insertable, Selectable } from 'kysely';
import { UserId } from '@modules/notifications/domain/TypedId/UserId';
import { UserSettings } from '@modules/notifications/domain/VO/UserSettings.VO';
import { UserNotification } from '@modules/notifications/domain/aggregate/UserNotification';
import { DB } from '@/infrastructure/database/types';
import { Email } from '@modules/notifications/domain/VO/Email.VO';

export class UserNotificationMapper {
  static toDomain(row: Selectable<DB['user_notifications']>): UserNotification {
    const userId = new UserId(row.user_id);
    const email = Email.create(row.email);
    const settings = UserSettings.create({
      receive_email_notifications: row.receive_email_notifications,
      receive_notifications: row.receive_notifications,
      receive_important_messages: row.receive_important_messages,
      receive_not_important_messages: row.receive_not_important_messages,
      receive_phone_notifications: row.receive_phone_notifications,
    });

    return UserNotification.fromPersist(
      userId,
      email,
      row.phone_number,
      settings,
    );
  }

  static toPersistence(
    aggregate: UserNotification,
  ): Insertable<DB['user_notifications']> {
    return {
      user_id: aggregate.id.toString(),
      email: aggregate.email.toString(),
      phone_number: aggregate.phoneNumber,
      ...aggregate.settings.toPlain(),
    };
  }
}
