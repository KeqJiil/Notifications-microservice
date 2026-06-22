import {
  IChannelStrategy,
  NotificationContext,
} from '@modules/notifications/application/abstractions/notifications/notificationsStrategy';
import { renderSmsTemplate } from '@modules/notifications/infrastructure/notification-strategies/templates/sms';
import { IFanOutService } from '@modules/notifications/application/abstractions/FanOutService.interface';

export class InAppNotificationsStrategy implements IChannelStrategy {
  readonly channel = 'inapp' as const;

  constructor(private readonly fanOut: IFanOutService) {}

  async send(ctx: NotificationContext): Promise<void> {
    const userId = ctx.userId.toString();
    const message = renderSmsTemplate(ctx.notification);

    await this.fanOut.pushOne({
      userId,
      message,
      createdAt: ctx.createdAt.toISOString(),
      idempotencyKey: ctx.idempotencyKey,
    });
  }
}
