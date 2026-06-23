import {
  OutboxDefaultMessagePayload,
  OutboxRecord,
} from '@modules/notifications/application/abstractions/outbox/OutboxRecord.interface';
import { IInboxRepository } from '@modules/notifications/application/abstractions/inbox/InboxRepository.interface';
import { IUserNotificationsRepository } from '@modules/notifications/application/abstractions/userNotifications/UserNotificationsRepository.interface';
import { UserId } from '@modules/notifications/domain/TypedId/UserId';
import {
  IChannelStrategy,
  NotificationContext,
} from '@modules/notifications/application/abstractions/notifications/notificationsStrategy';
import { IChannelTypes } from '@modules/notifications/application/abstractions/incomingQueueTypes';
import { IUseCase } from '@modules/notifications/application/services/useCase.dispatcher';

export class DefaultMessageUseCase implements IUseCase<OutboxDefaultMessagePayload> {
  constructor(
    private readonly inbox: IInboxRepository,
    private readonly senders: Map<IChannelTypes, IChannelStrategy>,
    private readonly userRepository: IUserNotificationsRepository,
  ) {}

  async execute(
    payload: OutboxRecord<OutboxDefaultMessagePayload>,
  ): Promise<void> {
    const inboxId = `${payload.payload.channel}:${payload.payload.userId}:${payload.eventId}`;
    await this.inbox.insert(inboxId);
    const inboxData = await this.inbox.get(inboxId);
    if (inboxData?.success) return;

    const userId = new UserId(payload.payload.userId);
    const user = await this.userRepository.findById(userId);
    if (!user) throw new Error(`User with id ${userId.toString()} not found`);

    const strategy = this.senders.get(payload.payload.channel);
    if (!strategy)
      throw new Error(`Unable to find channel id ${payload.payload.channel}`);
    const ctx: NotificationContext = {
      userId,
      recipient: { email: user.email, phoneNumber: user.phoneNumber },
      notification: {
        kind: 'message',
        type: payload.payload.type,
        message: payload.payload.message,
      },
      idempotencyKey: `${payload.payload.channel}:${payload.payload.userId}:${payload.eventId}`,
      createdAt: payload.createdAt,
    };

    await strategy.send(ctx);

    await this.inbox.markSuccess(inboxId);
  }
}
