import { OutboxDefaultMessagePayload } from '@modules/notifications/application/abstractions/outbox/OutboxRecord.interface';
import { IInboxRepository } from '@modules/notifications/application/abstractions/inbox/InboxRepository.interface';
import { IUserNotificationsRepository } from '@modules/notifications/application/abstractions/userNotifications/UserNotificationsRepository.interface';
import { UserId } from '@modules/notifications/domain/TypedId/UserId';
import { UoWInterface } from '@modules/notifications/application/abstractions/UoW.interface';
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
    private readonly uow: UoWInterface,
  ) {}

  async execute(
    payload: OutboxDefaultMessagePayload,
    eventId: string,
    createdAt: Date,
  ): Promise<void> {
    const inboxId = `${payload.channel}:${payload.userId}:${eventId}`;
    await this.uow.run(async () => {
      await this.inbox.insert(inboxId);
    });
    const userId = new UserId(payload.userId);
    const user = await this.userRepository.findById(userId);
    if (!user) return;

    const strategy = this.senders.get(payload.channel);
    if (strategy) {
      const ctx: NotificationContext = {
        userId,
        recipient: { email: user.email, phoneNumber: user.phoneNumber },
        notification: {
          kind: 'message',
          type: payload.type,
          message: payload.message,
        },
        createdAt,
      };

      const result = await strategy.send(ctx);
      if (result === 'sent') {
        await this.uow.run(() =>
          this.inbox.changeStage(inboxId, payload.channel),
        );
      }
    }

    await this.inbox.markSuccess(inboxId);
  }
}
