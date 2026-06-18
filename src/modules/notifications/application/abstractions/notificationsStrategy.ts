import { Email } from '@modules/notifications/domain/VO/Email.VO';

export interface INotificationStrategy {
  send(email: Email): Promise<void>;
}
