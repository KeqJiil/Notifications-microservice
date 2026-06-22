import {AccountCreatedPayload} from '@modules/notifications/application/abstractions/incomingQueueTypes';
import {
  IUserNotificationsRepository
} from '@modules/notifications/application/abstractions/userNotifications/UserNotificationsRepository.interface';
import {UserId} from '@modules/notifications/domain/TypedId/UserId';
import {UserSettings} from '@modules/notifications/domain/VO/UserSettings.VO';
import {Email} from '@modules/notifications/domain/VO/Email.VO';
import {UserNotification} from '@modules/notifications/domain/aggregate/UserNotification';

export class AccountCreatedUseCase {
  constructor(
    private readonly userNotifications: IUserNotificationsRepository,
  ) {}

  async execute(payload: AccountCreatedPayload): Promise<void> {
    const userId = new UserId(payload.userId);
    const settings = UserSettings.create(payload.settings);
    const email = Email.create(payload.email);
    const user = UserNotification.create(
      userId,
      email,
      payload.phoneNumber,
      settings,
    );

    await this.userNotifications.save(user);
  }
}
