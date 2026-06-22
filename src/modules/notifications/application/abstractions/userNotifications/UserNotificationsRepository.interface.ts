import { UserNotification } from '@modules/notifications/domain/aggregate/UserNotification';
import { UserId } from '@modules/notifications/domain/TypedId/UserId';

export interface IUserNotificationsRepository {
  findById(id: UserId): Promise<UserNotification | null>;
  save(aggregate: UserNotification): Promise<void>;
}
