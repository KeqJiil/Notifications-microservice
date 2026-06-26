import { NotificationPayload } from '@modules/notifications/application/abstractions/notifications/NotificationPayload';

export interface IFeedRecord {
  id: string;
  idempotencyKey: string;
  userId: string;
  payload: NotificationPayload;
  createdAt: Date;
  isRead: boolean;
}
