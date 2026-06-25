import { NotificationPayload } from '@modules/notifications/application/abstractions/notifications/NotificationPayload';
import { renderMessageSms } from '@modules/notifications/infrastructure/notification-strategies/templates/sms/message.template';
import { renderAccountCreatedSms } from '@modules/notifications/infrastructure/notification-strategies/templates/sms/accountCreated.template';

export function renderSmsTemplate(notification: NotificationPayload): string {
  switch (notification.kind) {
    case 'message':
      return renderMessageSms(notification);
    case 'accountCreated':
      return renderAccountCreatedSms();
    default: {
      throw new Error(
        `Unhandled notification kind: ${JSON.stringify(notification)}`,
      );
    }
  }
}
