import { INotificationStrategy } from '@modules/notifications/application/abstractions/notifications/notificationsStrategy';
import { NotificationPayload } from '@modules/notifications/application/abstractions/notifications/NotificationPayload';
import { Email } from '@modules/notifications/domain/VO/Email.VO';

export interface IEmailNotificationsData {
  email: Email;
  notification: NotificationPayload;
}

export interface IEmailNotificationsStrategy extends INotificationStrategy<IEmailNotificationsData> {}
