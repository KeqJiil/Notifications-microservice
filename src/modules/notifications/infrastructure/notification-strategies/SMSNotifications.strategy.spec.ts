import { RestException, Twilio } from 'twilio';
import { SMSNotificationsStrategy } from '@modules/notifications/infrastructure/notification-strategies/SMSNotifications.strategy';
import { NotificationContext } from '@modules/notifications/application/abstractions/notifications/notificationsStrategy';
import { NonRetryableException } from '@/common/errors/NonRetryable.exception';
import { UserId } from '@modules/notifications/domain/TypedId/UserId';

function createTwilioMock(): Twilio {
  return {
    messages: { create: jest.fn() },
  } as unknown as Twilio;
}

function createContext(
  overrides: Partial<NotificationContext> = {},
): NotificationContext {
  return {
    userId: new UserId('11111111-1111-1111-1111-111111111111'),
    recipient: { email: null, phoneNumber: '+19999999999' },
    notification: { kind: 'message', type: 'password_changed', message: 'hi' },
    idempotencyKey: 'sms:11111111-1111-1111-1111-111111111111:evt-1',
    createdAt: new Date(),
    ...overrides,
  };
}

describe('SMSNotificationsStrategy', () => {
  it('returns early without calling Twilio when recipient.phoneNumber is empty', async () => {
    const twilio = createTwilioMock();
    const strategy = new SMSNotificationsStrategy(twilio, '+10000000000');

    await strategy.send(
      createContext({ recipient: { email: null, phoneNumber: null } }),
    );

    expect(twilio.messages.create).not.toHaveBeenCalled();
  });

  it('happy path calls twilio.messages.create with from/to/body', async () => {
    const twilio = createTwilioMock();
    (twilio.messages.create as jest.Mock).mockResolvedValueOnce({});
    const strategy = new SMSNotificationsStrategy(twilio, '+10000000000');

    await strategy.send(createContext());

    expect(twilio.messages.create).toHaveBeenCalledWith(
      expect.objectContaining({ from: '+10000000000', to: '+19999999999' }),
    );
  });

  it('RestException with a 4xx status throws NonRetryableException', async () => {
    const twilio = createTwilioMock();
    const restError = new RestException({
      statusCode: 400,
      body: { message: 'Invalid phone number' },
    });
    (twilio.messages.create as jest.Mock).mockRejectedValueOnce(restError);
    const strategy = new SMSNotificationsStrategy(twilio, '+10000000000');

    await expect(strategy.send(createContext())).rejects.toBeInstanceOf(
      NonRetryableException,
    );
  });

  it('RestException with status 429 is rethrown as-is (retryable)', async () => {
    const twilio = createTwilioMock();
    const restError = new RestException({
      statusCode: 429,
      body: { message: 'Too many requests' },
    });
    (twilio.messages.create as jest.Mock).mockRejectedValueOnce(restError);
    const strategy = new SMSNotificationsStrategy(twilio, '+10000000000');

    await expect(strategy.send(createContext())).rejects.toBe(restError);
  });

  it('a plain Error (not a RestException) is rethrown unchanged', async () => {
    const twilio = createTwilioMock();
    const networkError = new Error('socket hang up');
    (twilio.messages.create as jest.Mock).mockRejectedValueOnce(networkError);
    const strategy = new SMSNotificationsStrategy(twilio, '+10000000000');

    await expect(strategy.send(createContext())).rejects.toBe(networkError);
  });
});
