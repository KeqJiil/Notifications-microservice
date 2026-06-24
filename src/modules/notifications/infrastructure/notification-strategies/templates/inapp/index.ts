import { NotificationPayload } from '@modules/notifications/application/abstractions/notifications/NotificationPayload';
import { renderMessageInApp } from '@modules/notifications/infrastructure/notification-strategies/templates/inapp/message.template';
import { renderAccountCreatedInApp } from '@modules/notifications/infrastructure/notification-strategies/templates/inapp/accountCreated.template';

export function renderInAppTemplate(notification: NotificationPayload): string {
  switch (notification.kind) {
    case 'message':
      return renderMessageInApp(notification);
    case 'accountCreated':
      return renderAccountCreatedInApp();
    default: {
      throw new Error(
        `Unhandled notification kind: ${JSON.stringify(notification)}`,
      );
    }
  }
}
