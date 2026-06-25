import { NotificationPayloadOfKind } from '@modules/notifications/application/abstractions/notifications/NotificationPayload';
import { EmailContent } from '@modules/notifications/infrastructure/notification-strategies/templates/email/EmailContent.interface';

export function renderAccountCreatedEmail(
  notification: NotificationPayloadOfKind<'accountCreated'>,
): EmailContent {
  const { email } = notification.data;
  return {
    subject: 'Welcome to Booking!',
    html: `
      <h1>Welcome!</h1>
      <p>Your account has been created with the email <strong>${email}</strong>.</p>
      <p>Please confirm your account to start booking.</p>
    `,
  };
}
