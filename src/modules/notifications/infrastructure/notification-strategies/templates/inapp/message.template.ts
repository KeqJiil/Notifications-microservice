import { NotificationPayloadOfKind } from '@modules/notifications/application/abstractions/notifications/NotificationPayload';

export function renderMessageInApp(
  notification: NotificationPayloadOfKind<'message'>,
): string {
  return notification.message;
}
