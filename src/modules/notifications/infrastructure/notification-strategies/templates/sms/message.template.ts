import { NotificationPayloadOfKind } from '@modules/notifications/application/abstractions/notifications/NotificationPayload';

export function renderMessageSms(
  notification: NotificationPayloadOfKind<'message'>,
): string {
  return notification.message;
}
