import { Twilio } from 'twilio';
import {
  ISMSNotificationsData,
  ISMSNotificationsStrategy,
} from '@modules/notifications/application/abstractions/notifications/ISMSNotifications';
import { renderSmsTemplate } from '@modules/notifications/infrastructure/notification-strategies/templates/sms';

export class SMSNotificationsStrategy implements ISMSNotificationsStrategy {
  constructor(
    private readonly sender: Twilio,
    private readonly fromNumber: string,
  ) {}

  async send(data: ISMSNotificationsData): Promise<void> {
    const body = renderSmsTemplate(data.notification);
    await this.sender.messages.create({
      body,
      from: this.fromNumber,
      to: data.phoneNumber,
    });
  }
}
