import { Resend } from 'resend';
import { EmailNotificationsStrategy } from '@modules/notifications/infrastructure/notification-strategies/EmailNotifications.strategy';
import { NotificationContext } from '@modules/notifications/application/abstractions/notifications';
import { UserId } from '@modules/notifications/domain/TypedId/UserId';
import { NonRetryableException } from '@/common/errors/NonRetryable.exception';
import { RetryableException } from '@/common/errors/Retryable.exception';
import { Email } from '@modules/notifications/domain/VO/Email.VO';

function createResend(): Resend {
  return {
    emails: {
      send: jest.fn(),
    },
  } as unknown as Resend;
}

const email = 'abc@gmail.com';

function createContext(
  overrides: Partial<NotificationContext> = {},
): NotificationContext {
  return {
    userId: new UserId('11111111-1111-1111-1111-111111111111'),
    recipient: {
      email: Email.create('adsadafwadaw@gmail.coo'),
      phoneNumber: '+19999999999',
    },
    notification: { kind: 'message', type: 'password_changed', message: 'hi' },
    idempotencyKey: 'sms:11111111-1111-1111-1111-111111111111:evt-1',
    createdAt: new Date(),
    ...overrides,
  };
}

describe('EmailNotificationsStrategy', () => {
  it('returns early without sending when recipient.email is empty', async () => {
    const resend = createResend();
    const strategy = new EmailNotificationsStrategy(resend, email);
    const context = createContext({
      recipient: {
        email: null,
        phoneNumber: null,
      },
    });
    await expect(strategy.send(context)).resolves.toBeUndefined();
    expect(resend.emails.send).not.toHaveBeenCalled();
  });

  it('resolves silently when Resend returns no error', async () => {
    const resend = createResend();
    const strategy = new EmailNotificationsStrategy(resend, email);
    const context = createContext();
    (resend.emails.send as jest.Mock).mockResolvedValue({
      data: { id: 'x' },
      error: null,
    });
    await expect(strategy.send(context)).resolves.toBeUndefined();
    expect(resend.emails.send).toHaveBeenCalled();
  });

  it('Resend error statusCode 400 -> throws NonRetryableException', async () => {
    const resend = createResend();
    const strategy = new EmailNotificationsStrategy(resend, email);
    const context = createContext();
    (resend.emails.send as jest.Mock).mockResolvedValue({
      error: { statusCode: 400 },
    });
    await expect(strategy.send(context)).rejects.toBeInstanceOf(
      NonRetryableException,
    );
  });

  it('Resend error statusCode 429 -> throws RetryableException', async () => {
    const resend = createResend();
    const strategy = new EmailNotificationsStrategy(resend, email);
    const context = createContext();
    (resend.emails.send as jest.Mock).mockResolvedValue({
      error: { statusCode: 429 },
    });
    await expect(strategy.send(context)).rejects.toBeInstanceOf(
      RetryableException,
    );
  });

  it('Resend error statusCode 500 -> throws RetryableException', async () => {
    const resend = createResend();
    const strategy = new EmailNotificationsStrategy(resend, email);
    const context = createContext();
    (resend.emails.send as jest.Mock).mockResolvedValue({
      error: { statusCode: 500 },
    });
    await expect(strategy.send(context)).rejects.toBeInstanceOf(
      RetryableException,
    );
  });

  it('passes idempotencyKey through to Resend send options', async () => {
    const resend = createResend();
    const strategy = new EmailNotificationsStrategy(resend, email);
    const context = createContext();
    (resend.emails.send as jest.Mock).mockResolvedValue({
      data: { id: 'x' },
      error: null,
    });
    await expect(strategy.send(context)).resolves.toBeUndefined();
    expect(resend.emails.send).toHaveBeenCalledWith(expect.anything(), {
      idempotencyKey: context.idempotencyKey,
    });
  });
});
