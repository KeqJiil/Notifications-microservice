import {
  UserSettingKey,
  UserSettings,
} from '@modules/notifications/domain/VO/UserSettings.VO';
import { IChannelTypes } from '@modules/notifications/application/abstractions/incomingQueueTypes';

export class NotificationSend {
  private static readonly map: Map<IChannelTypes, UserSettingKey> = new Map([
    ['email', 'receive_email_notifications'],
    ['sms', 'receive_phone_notifications'],
  ]);

  static isAbleToSend(VO: UserSettings, type: IChannelTypes) {
    const key = this.map.get(type);
    if (!key) return true;
    return VO.isEnabled(key);
  }
}
