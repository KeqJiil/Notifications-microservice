import { Resend } from 'resend';
import {
  IChannelStrategy,
  NotificationContext,
  SendResult,
} from '@modules/notifications/application/abstractions/notifications/notificationsStrategy';
import { renderEmailTemplate } from '@modules/notifications/infrastructure/notification-strategies/templates/email';

export class EmailNotificationsStrategy implements IChannelStrategy {
  readonly channel = 'email' as const;

  constructor(
    private readonly sender: Resend,
    private readonly fromEmail: string,
  ) {}

  async send(ctx: NotificationContext): Promise<SendResult> {
    if (!ctx.recipient.email) return 'skipped';

    const { subject, html } = renderEmailTemplate(ctx.notification);
    await this.sender.emails.send({
      from: this.fromEmail,
      to: ctx.recipient.email.toString(),
      subject,
      html,
    });

    return 'sent';
  }
}
