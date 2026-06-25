import { renderSmsTemplate } from '@modules/notifications/infrastructure/notification-strategies/templates/sms';
import { NotificationPayload } from '@modules/notifications/application/abstractions/notifications/NotificationPayload';

describe('renderSmsTemplate', () => {
  it('passes the message through as-is for a message notification', () => {
    const notification: NotificationPayload = {
      kind: 'message',
      type: 'chat_created',
      message: 'You have a new chat message.',
    };

    expect(renderSmsTemplate(notification)).toBe(
      'You have a new chat message.',
    );
  });

  it('returns the static welcome text for an accountCreated notification', () => {
    const notification: NotificationPayload = {
      kind: 'accountCreated',
      type: 'account_created',
      data: {
        type: 'account_created',
        userId: 'user-1',
        email: 'guest@example.com',
        phoneNumber: '+10000000000',
        settings: {
          receive_phone_notifications: true,
          receive_email_notifications: true,
          receive_notifications: true,
          receive_important_messages: true,
          receive_not_important_messages: true,
        },
      },
    };

    expect(renderSmsTemplate(notification)).toBe(
      'Welcome to Booking! Your account was created. Confirm it in the app to get started.',
    );
  });
});
