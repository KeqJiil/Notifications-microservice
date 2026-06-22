import { UserId } from '@modules/notifications/domain/TypedId/UserId';
import { Email } from '@modules/notifications/domain/VO/Email.VO';
import { UserSettingKey, UserSettings, } from '@modules/notifications/domain/VO/UserSettings.VO';
import { AggregateRoot } from '@modules/notifications/domain/aggregate/AggregateRoot';
import { PhoneNumberChangedEvent } from '@modules/notifications/domain/events/PhoneChanges.event';
import { NotificationAccountCreatedEvent } from '@modules/notifications/domain/events/NotificationAccountCreated.event';

export class UserNotification extends AggregateRoot {
  private constructor(
    private readonly _id: UserId,
    private readonly _email: Email,
    private _phoneNumber: string | null,
    private _notificationSettings: UserSettings,
  ) {
    super();
  }

  public static create(
    id: UserId,
    email: Email,
    phoneNumber: string | null,
    settings: UserSettings,
  ) {
    const aggregate = new UserNotification(id, email, phoneNumber, settings);
    aggregate.apply(new NotificationAccountCreatedEvent(id));
    return aggregate;
  }

  public static fromPersist(
    id: UserId,
    email: Email,
    phoneNumber: string | null,
    settings: UserSettings,
  ) {
    return new UserNotification(id, email, phoneNumber, settings);
  }

  public changePhoneNumber(newPhoneNumber: string) {
    this._phoneNumber = newPhoneNumber;
    this.apply(new PhoneNumberChangedEvent(this._id, newPhoneNumber));
  }

  public enableSetting(key: UserSettingKey): void {
    this._notificationSettings = this._notificationSettings.enable(key);
  }

  public disableSetting(key: UserSettingKey): void {
    this._notificationSettings = this._notificationSettings.disable(key);
  }

  public enableAllNotifications(): void {
    this._notificationSettings = this._notificationSettings.turnOnAll();
  }

  public disableAllNotifications(): void {
    this._notificationSettings = this._notificationSettings.turnOffAll();
  }

  public isSettingEnabled(key: UserSettingKey): boolean {
    return this._notificationSettings.isEnabled(key);
  }

  get id() {
    return this._id;
  }

  get email() {
    return this._email;
  }

  get phoneNumber() {
    return this._phoneNumber;
  }

  get settings() {
    return this._notificationSettings;
  }
}
