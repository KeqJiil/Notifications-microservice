export const UserSettingKey = {
  ReceiveNotifications: 'receive_notifications',
  ReceiveEmailNotifications: 'receive_email_notifications',
  ReceivePhoneNotifications: 'receive_phone_notifications',
  ReceiveImportantMessages: 'receive_important_messages',
  ReceiveNotImportantMessages: 'receive_not_important_messages',
} as const;

export type UserSettingKey =
  (typeof UserSettingKey)[keyof typeof UserSettingKey];

type SettingsMap = Record<UserSettingKey, boolean>;

export class UserSettings {
  private readonly settings: Readonly<SettingsMap>;

  private constructor(settings: SettingsMap) {
    this.settings = Object.freeze({ ...settings });
  }

  public static create(overrides: Partial<SettingsMap> = {}): UserSettings {
    const defaults = Object.fromEntries(
      Object.values(UserSettingKey).map((key) => [key, true]),
    ) as SettingsMap;
    return new UserSettings({ ...defaults, ...overrides });
  }

  public enable(key: UserSettingKey): UserSettings {
    return new UserSettings({ ...this.settings, [key]: true });
  }

  public disable(key: UserSettingKey): UserSettings {
    return new UserSettings({ ...this.settings, [key]: false });
  }

  public turnOnAll(): UserSettings {
    return UserSettings.create();
  }

  public turnOffAll(): UserSettings {
    const allOff = Object.fromEntries(
      Object.values(UserSettingKey).map((key) => [key, false]),
    ) as SettingsMap;
    return new UserSettings(allOff);
  }

  public isEnabled(key: UserSettingKey): boolean {
    return this.settings[key];
  }

  public equals(other: UserSettings): boolean {
    return Object.values(UserSettingKey).every(
      (key) => this.settings[key] === other.settings[key],
    );
  }

  public toPlain(): SettingsMap {
    return { ...this.settings };
  }
}
