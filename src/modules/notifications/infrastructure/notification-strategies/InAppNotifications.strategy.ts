import {
  IChannelStrategy,
  NotificationContext,
  SendResult,
} from '@modules/notifications/application/abstractions/notifications/notificationsStrategy';
import { renderSmsTemplate } from '@modules/notifications/infrastructure/notification-strategies/templates/sms';
import { IFanOutService } from '@modules/notifications/application/abstractions/FanOutService.interface';

export class InAppNotificationsStrategy implements IChannelStrategy {
  readonly channel = 'inapp' as const;

  constructor(private readonly fanOut: IFanOutService) {}

  async send(ctx: NotificationContext): Promise<SendResult> {
    const userId = ctx.userId.toString();
    const message = renderSmsTemplate(ctx.notification);

    await this.fanOut.pushOne({
      userId,
      message,
      createdAt: ctx.createdAt.toISOString(),
    });

    return 'sent';
  }
}
