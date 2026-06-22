import { IChannelTypes } from '@modules/notifications/application/abstractions/incomingQueueTypes';
import { NotificationPayload } from '@modules/notifications/application/abstractions/notifications/NotificationPayload';
import { UserId } from '@modules/notifications/domain/TypedId/UserId';
import { Email } from '@modules/notifications/domain/VO/Email.VO';

export interface NotificationContext {
  userId: UserId;
  recipient: { email: Email | null; phoneNumber: string | null };
  notification: NotificationPayload;
  idempotencyKey: string;
  createdAt: Date;
}

export interface IChannelStrategy {
  readonly channel: IChannelTypes;
  send(ctx: NotificationContext): Promise<void>;
}
