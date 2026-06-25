import { renderEmailTemplate } from '@modules/notifications/infrastructure/notification-strategies/templates/email';
import { NotificationPayload } from '@modules/notifications/application/abstractions/notifications/NotificationPayload';

describe('renderEmailTemplate', () => {
  it('renders a known subject for a message notification', () => {
    const notification: NotificationPayload = {
      kind: 'message',
      type: 'password_changed',
      message: 'Your password was changed at 12:00.',
    };

    const result = renderEmailTemplate(notification);

    expect(result.subject).toBe('Your password was changed');
    expect(result.html).toContain('Your password was changed at 12:00.');
  });

  it('falls back to a generic subject for an event without a mapped subject', () => {
    const notification: NotificationPayload = {
      kind: 'message',
      type: 'unknown_event' as NotificationPayload['type'],
      message: 'hello',
    };

    const result = renderEmailTemplate(notification);

    expect(result.subject).toBe('Notification from Booking');
  });

  it('renders the accountCreated template with the recipient email', () => {
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

    const result = renderEmailTemplate(notification);

    expect(result.subject).toBe('Welcome to Booking!');
    expect(result.html).toContain('guest@example.com');
  });
});
