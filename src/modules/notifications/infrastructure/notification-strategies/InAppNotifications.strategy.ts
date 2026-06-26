import {
  IChannelStrategy,
  NotificationContext,
} from '@modules/notifications/application/abstractions/notifications/notificationsStrategy';
import { renderInAppTemplate } from '@modules/notifications/infrastructure/notification-strategies/templates/inapp';
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
    const message = renderInAppTemplate(ctx.notification);

    const { id } = await this.feed.insert({
      idempotencyKey: ctx.idempotencyKey,
      userId: ctx.userId,
      payload: ctx.notification,
      createdAt: ctx.createdAt,
    });

    await this.fanOut.pushOne({
      id,
      userId,
      message,
      createdAt: ctx.createdAt.toISOString(),
      idempotencyKey: ctx.idempotencyKey,
    });
  }
}
