import { OutboxDefaultMessagePayload } from '@modules/notifications/application/abstractions/outbox/OutboxRecord.interface';
import { IInboxRepository } from '@modules/notifications/application/abstractions/inbox/InboxRepository.interface';
import { IUserNotificationsRepository } from '@modules/notifications/application/abstractions/userNotifications/UserNotificationsRepository.interface';
import { UserId } from '@modules/notifications/domain/TypedId/UserId';
import {
  IChannelStrategy,
  NotificationContext,
} from '@modules/notifications/application/abstractions/notifications/notificationsStrategy';
import { IChannelTypes } from '@modules/notifications/application/abstractions/incomingQueueTypes';

export class DefaultMessageUseCase {
  constructor(
    private readonly inbox: IInboxRepository,
    private readonly senders: Map<IChannelTypes, IChannelStrategy>,
    private readonly userRepository: IUserNotificationsRepository,
  ) {}

  async execute(
    payload: OutboxDefaultMessagePayload,
    eventId: string,
    createdAt: Date,
  ): Promise<void> {
    const inboxId = `${payload.channel}:${payload.userId}:${eventId}`;
    await this.inbox.insert(inboxId);
    const inboxData = await this.inbox.get(inboxId);
    if (inboxData?.success) return;

    const userId = new UserId(payload.userId);
    const user = await this.userRepository.findById(userId);
    if (!user) throw new Error(`User with id ${userId.toString()} not found`);

    const strategy = this.senders.get(payload.channel);
    if (!strategy)
      throw new Error(`Unable to find channel id ${payload.channel}`);
    const ctx: NotificationContext = {
      userId,
      recipient: { email: user.email, phoneNumber: user.phoneNumber },
      notification: {
        kind: 'message',
        type: payload.type,
        message: payload.message,
      },
      idempotencyKey: `${payload.channel}:${payload.userId}:${eventId}`,
      createdAt,
    };

    await strategy.send(ctx);

    await this.inbox.markSuccess(inboxId);
  }
}
