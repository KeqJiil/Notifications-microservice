import { NotificationPayload } from '@modules/notifications/application/abstractions/notifications/NotificationPayload';
import { EmailContent } from '@modules/notifications/infrastructure/notification-strategies/templates/email/EmailContent.interface';
import { renderMessageEmail } from '@modules/notifications/infrastructure/notification-strategies/templates/email/message.template';
import { renderAccountCreatedEmail } from '@modules/notifications/infrastructure/notification-strategies/templates/email/accountCreated.template';

export type { EmailContent };

export function renderEmailTemplate(
  notification: NotificationPayload,
): EmailContent {
  switch (notification.kind) {
    case 'message':
      return renderMessageEmail(notification);
    case 'accountCreated':
      return renderAccountCreatedEmail(notification);
    default: {
      throw new Error(
        `Unhandled notification kind: ${JSON.stringify(notification)}`,
      );
    }
  }
}
