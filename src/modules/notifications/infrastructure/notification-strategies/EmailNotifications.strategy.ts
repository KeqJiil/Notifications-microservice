import { Resend } from 'resend';
import {
  IChannelStrategy,
  NotificationContext,
} from '@modules/notifications/application/abstractions/notifications/notificationsStrategy';
import { renderEmailTemplate } from '@modules/notifications/infrastructure/notification-strategies/templates/email';
import { NonRetryableException } from '@/common/errors/NonRetryable.exception';
import { RetryableException } from '@/common/errors/Retryable.exception';
import { isClientErrorStatus } from '@/common/errors/helpers/isClientErrorStatus';

export class EmailNotificationsStrategy implements IChannelStrategy {
  readonly channel = 'email' as const;

  constructor(
    private readonly sender: Resend,
    private readonly fromEmail: string,
  ) {}

  async send(ctx: NotificationContext): Promise<void> {
    if (!ctx.recipient.email) return;

    const { subject, html } = renderEmailTemplate(ctx.notification);
    const { error } = await this.sender.emails.send(
      {
        from: this.fromEmail,
        to: ctx.recipient.email.toString(),
        subject,
        html,
      },
      {
        idempotencyKey: ctx.idempotencyKey,
      },
    );

    if (!error) return;

    if (isClientErrorStatus(error.statusCode)) {
      throw new NonRetryableException(
        `Resend error ${error.name}: ${error.message}`,
      );
    }
    throw new RetryableException(
      `Resend error ${error.name}: ${error.message}`,
    );
  }
}
