import { Resend } from 'resend';
import {
  IEmailNotificationsData,
  IEmailNotificationsStrategy,
} from '@modules/notifications/application/abstractions/notifications/IEmailNotificationsStrategy';
import { renderEmailTemplate } from '@modules/notifications/infrastructure/notification-strategies/templates/email';

export class EmailNotificationsStrategy implements IEmailNotificationsStrategy {
  constructor(
    private readonly sender: Resend,
    private readonly fromEmail: string,
  ) {}

  async send(data: IEmailNotificationsData): Promise<void> {
    const { subject, html } = renderEmailTemplate(data.notification);
    await this.sender.emails.send({
      from: this.fromEmail,
      to: data.email.toString(),
      subject,
      html,
    });
  }
}
