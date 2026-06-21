import { INotificationStrategy } from '@modules/notifications/application/abstractions/notifications/notificationsStrategy';
import { NotificationPayload } from '@modules/notifications/application/abstractions/notifications/NotificationPayload';

export interface ISMSNotificationsData {
  phoneNumber: string;
  notification: NotificationPayload;
}

export interface ISMSNotificationsStrategy extends INotificationStrategy<ISMSNotificationsData> {}
