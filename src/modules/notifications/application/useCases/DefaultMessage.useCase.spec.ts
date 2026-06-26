import { DefaultMessageUseCase } from '@modules/notifications/application/useCases/DefaultMessage.useCase';
import { IInboxRepository } from '@modules/notifications/application/abstractions/inbox/InboxRepository.interface';
import { IUserNotificationsRepository } from '@modules/notifications/application/abstractions/userNotifications/UserNotificationsRepository.interface';
import { IChannelStrategy } from '@modules/notifications/application/abstractions/notifications/notificationsStrategy';
import { IChannelTypes } from '@modules/notifications/application/abstractions/incomingQueueTypes';
import {
  OutboxDefaultMessagePayload,
  OutboxRecord,
} from '@modules/notifications/application/abstractions/outbox/OutboxRecord.interface';
import { UserNotification } from '@modules/notifications/domain/aggregate/UserNotification';
import { UserId } from '@modules/notifications/domain/TypedId/UserId';
import { Email } from '@modules/notifications/domain/VO/Email.VO';
import { UserSettings } from '@modules/notifications/domain/VO/UserSettings.VO';
import { NonRetryableException } from '@/common/errors/NonRetryable.exception';

function createInbox(
  overrides: Partial<IInboxRepository> = {},
): IInboxRepository {
  return {
    insert: jest.fn().mockResolvedValue(undefined),
    changeStage: jest.fn().mockResolvedValue(undefined),
    markSuccess: jest.fn().mockResolvedValue(undefined),
    get: jest.fn().mockResolvedValue(null),
    ...overrides,
  };
}

function createUserRepository(
  user: UserNotification | null,
): IUserNotificationsRepository {
  return {
    findById: jest.fn().mockResolvedValue(user),
    save: jest.fn().mockResolvedValue(undefined),
  };
}

function createStrategy(channel: IChannelTypes): IChannelStrategy {
  return { channel, send: jest.fn().mockResolvedValue(undefined) };
}

function createUser(
  settings: UserSettings = UserSettings.create(),
): UserNotification {
  return UserNotification.fromPersist(
    new UserId('11111111-1111-1111-1111-111111111111'),
    Email.create('user@example.com'),
    '+19999999999',
    settings,
  );
}

function createPayload(
  overrides: Partial<OutboxDefaultMessagePayload> = {},
): OutboxRecord<OutboxDefaultMessagePayload> {
  return {
    id: 'outbox-1',
    eventId: 'evt-1',
    retries: 0,
    createdAt: new Date(),
    payload: {
      userId: '11111111-1111-1111-1111-111111111111',
      channel: 'email',
      type: 'password_changed',
      message: 'hi',
      ...overrides,
    },
  };
}

describe('DefaultMessageUseCase', () => {
  it('returns early without sending when inbox record is already success', async () => {
    const inbox = createInbox({
      get: jest.fn().mockResolvedValue({
        id: 'inbox-1',
        success: true,
        stage: null,
        processedAt: new Date(),
        createdAt: new Date(),
      }),
    });
    const userRepository = createUserRepository(createUser());
    const strategy = createStrategy('email');
    const senders = new Map<IChannelTypes, IChannelStrategy>([
      ['email', strategy],
    ]);
    const useCase = new DefaultMessageUseCase(inbox, senders, userRepository);

    await useCase.execute(createPayload());

    expect(userRepository.findById).not.toHaveBeenCalled();
    expect(strategy.send).not.toHaveBeenCalled();
    expect(inbox.markSuccess).not.toHaveBeenCalled();
  });

  it('throws NonRetryableException when the user is not found', async () => {
    const inbox = createInbox();
    const userRepository = createUserRepository(null);
    const strategy = createStrategy('email');
    const senders = new Map<IChannelTypes, IChannelStrategy>([
      ['email', strategy],
    ]);
    const useCase = new DefaultMessageUseCase(inbox, senders, userRepository);

    await expect(useCase.execute(createPayload())).rejects.toBeInstanceOf(
      NonRetryableException,
    );
    expect(strategy.send).not.toHaveBeenCalled();
  });

  it('returns without sending when the user opted out (NotificationSend=false)', async () => {
    const inbox = createInbox();
    const userRepository = createUserRepository(
      createUser(UserSettings.create({ receive_email_notifications: false })),
    );
    const strategy = createStrategy('email');
    const senders = new Map<IChannelTypes, IChannelStrategy>([
      ['email', strategy],
    ]);
    const useCase = new DefaultMessageUseCase(inbox, senders, userRepository);

    await useCase.execute(createPayload());

    expect(strategy.send).not.toHaveBeenCalled();
    expect(inbox.markSuccess).toHaveBeenCalled();
  });

  it('throws NonRetryableException when no strategy is registered for the channel', async () => {
    const inbox = createInbox();
    const userRepository = createUserRepository(createUser());
    const senders = new Map<IChannelTypes, IChannelStrategy>();
    const useCase = new DefaultMessageUseCase(inbox, senders, userRepository);

    await expect(useCase.execute(createPayload())).rejects.toBeInstanceOf(
      NonRetryableException,
    );
  });

  it('happy path: calls strategy.send with the correct NotificationContext + idempotencyKey', async () => {
    const inbox = createInbox();
    const user = createUser();
    const userRepository = createUserRepository(user);
    const strategy = createStrategy('email');
    const senders = new Map<IChannelTypes, IChannelStrategy>([
      ['email', strategy],
    ]);
    const useCase = new DefaultMessageUseCase(inbox, senders, userRepository);
    const payload = createPayload();

    await useCase.execute(payload);

    expect(strategy.send).toHaveBeenCalledWith({
      userId: user.id,
      recipient: { email: user.email, phoneNumber: user.phoneNumber },
      notification: {
        kind: 'message',
        type: payload.payload.type,
        message: payload.payload.message,
      },
      idempotencyKey: `${payload.payload.channel}:${payload.payload.userId}:${payload.eventId}`,
      createdAt: payload.createdAt,
    });
  });

  it('happy path: marks inbox success after a successful send', async () => {
    const inbox = createInbox();
    const userRepository = createUserRepository(createUser());
    const strategy = createStrategy('email');
    const senders = new Map<IChannelTypes, IChannelStrategy>([
      ['email', strategy],
    ]);
    const useCase = new DefaultMessageUseCase(inbox, senders, userRepository);
    const payload = createPayload();

    await useCase.execute(payload);

    expect(inbox.markSuccess).toHaveBeenCalledWith(payload.id);
  });

  it('is idempotent: second run with same eventId/channel/userId does not send twice', async () => {
    const inboxRecord = {
      id: 'inbox-1',
      success: false,
      stage: null,
      processedAt: null,
      createdAt: new Date(),
    };
    const inbox = createInbox({
      get: jest.fn().mockResolvedValue(inboxRecord),
    });
    const userRepository = createUserRepository(createUser());
    const strategy = createStrategy('email');
    const senders = new Map<IChannelTypes, IChannelStrategy>([
      ['email', strategy],
    ]);
    const useCase = new DefaultMessageUseCase(inbox, senders, userRepository);
    const payload = createPayload();

    await useCase.execute(payload);
    inboxRecord.success = true;
    (strategy.send as jest.Mock).mockClear();
    await useCase.execute(payload);

    expect(strategy.send).not.toHaveBeenCalled();
  });
});
