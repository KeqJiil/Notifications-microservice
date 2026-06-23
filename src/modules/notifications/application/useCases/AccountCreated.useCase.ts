import { AccountCreatedPayload } from '@modules/notifications/application/abstractions/incomingQueueTypes';
import { IUserNotificationsRepository } from '@modules/notifications/application/abstractions/userNotifications/UserNotificationsRepository.interface';
import { UserId } from '@modules/notifications/domain/TypedId/UserId';
import { UserSettings } from '@modules/notifications/domain/VO/UserSettings.VO';
import { Email } from '@modules/notifications/domain/VO/Email.VO';
import { UserNotification } from '@modules/notifications/domain/aggregate/UserNotification';
import { OutboxRecord } from '@modules/notifications/application/abstractions/outbox/OutboxRecord.interface';
import { IUseCase } from '@modules/notifications/application/services/useCase.dispatcher';

export class AccountCreatedUseCase implements IUseCase<AccountCreatedPayload> {
  constructor(
    private readonly userNotifications: IUserNotificationsRepository,
  ) {}

  async execute(payload: OutboxRecord<AccountCreatedPayload>): Promise<void> {
    const userId = new UserId(payload.payload.userId);
    const settings = UserSettings.create(payload.payload.settings);
    const email = Email.create(payload.payload.email);
    const user = UserNotification.create(
      userId,
      email,
      payload.payload.phoneNumber,
      settings,
    );

    await this.userNotifications.save(user);
  }
}
