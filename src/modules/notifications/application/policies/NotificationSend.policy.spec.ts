import { NotificationSend } from '@modules/notifications/application/policies/NotificationSend.policy';
import { UserSettings } from '@modules/notifications/domain/VO/UserSettings.VO';

describe('NotificationSend.isAbleToSend', () => {
  it('blocks email when receive_email_notifications is disabled', () => {
    const settings = UserSettings.create({
      receive_email_notifications: false,
    });
    expect(NotificationSend.isAbleToSend(settings, 'email')).toBe(false);
  });

  it('blocks sms when receive_phone_notifications is disabled', () => {
    const settings = UserSettings.create({
      receive_phone_notifications: false,
    });
    expect(NotificationSend.isAbleToSend(settings, 'sms')).toBe(false);
  });

  it('allows email when the setting is enabled', () => {
    const settings = UserSettings.create({ receive_email_notifications: true });
    expect(NotificationSend.isAbleToSend(settings, 'email')).toBe(true);
  });

  it('always allows inapp — it has no opt-out key in the policy map', () => {
    const settings = UserSettings.create().turnOffAll();
    expect(NotificationSend.isAbleToSend(settings, 'inapp')).toBe(true);
  });
});
