import { UserId } from '@modules/notifications/domain/TypedId/UserId';
import { NotificationPayload } from '@modules/notifications/application/abstractions/notifications/NotificationPayload';

export interface IFeedRecord {
  id: string;
  idempotencyKey: string;
  userId: UserId;
  payload: NotificationPayload;
  createdAt: Date;
}
