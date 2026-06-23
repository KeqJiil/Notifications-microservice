import {
  IChannelStrategy,
  NotificationContext,
} from '@modules/notifications/application/abstractions/notifications/notificationsStrategy';
import { renderSmsTemplate } from '@modules/notifications/infrastructure/notification-strategies/templates/sms';
import { IFanOutService } from '@modules/notifications/application/abstractions/FanOutService.interface';
import { IFeedRepository } from '@modules/notifications/application/abstractions/feed/FeedRepository.interface';

export class InAppNotificationsStrategy implements IChannelStrategy {
  readonly channel = 'inapp' as const;

  constructor(
    private readonly fanOut: IFanOutService,
    private readonly feed: IFeedRepository,
  ) {}

  async send(ctx: NotificationContext): Promise<void> {
    const userId = ctx.userId.toString();
    const message = renderSmsTemplate(ctx.notification);

    await this.feed.insert({
      idempotencyKey: ctx.idempotencyKey,
      userId: ctx.userId,
      payload: ctx.notification,
      createdAt: ctx.createdAt,
    });

    await this.fanOut.pushOne({
      userId,
      message,
      createdAt: ctx.createdAt.toISOString(),
      idempotencyKey: ctx.idempotencyKey,
    });
  }
}
