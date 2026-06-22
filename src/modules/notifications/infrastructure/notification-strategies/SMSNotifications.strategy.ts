import { Twilio } from 'twilio';
import {
  IChannelStrategy,
  NotificationContext,
} from '@modules/notifications/application/abstractions/notifications/notificationsStrategy';
import { renderSmsTemplate } from '@modules/notifications/infrastructure/notification-strategies/templates/sms';

export class SMSNotificationsStrategy implements IChannelStrategy {
  readonly channel = 'sms' as const;

  constructor(
    private readonly sender: Twilio,
    private readonly fromNumber: string,
  ) {}

  async send(ctx: NotificationContext): Promise<void> {
    if (!ctx.recipient.phoneNumber) return;

    const body = renderSmsTemplate(ctx.notification);
    await this.sender.messages.create({
      body,
      from: this.fromNumber,
      to: ctx.recipient.phoneNumber,
    });
  }
}
