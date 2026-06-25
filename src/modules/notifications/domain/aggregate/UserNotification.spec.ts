import { UserNotification } from '@modules/notifications/domain/aggregate/UserNotification';
import { UserId } from '@modules/notifications/domain/TypedId/UserId';
import { Email } from '@modules/notifications/domain/VO/Email.VO';
import { UserSettings } from '@modules/notifications/domain/VO/UserSettings.VO';
import { NotificationAccountCreatedEvent } from '@modules/notifications/domain/events/NotificationAccountCreated.event';
import { PhoneNumberChangedEvent } from '@modules/notifications/domain/events/PhoneChanges.event';

function createAggregate() {
  return UserNotification.create(
    new UserId('11111111-1111-1111-1111-111111111111'),
    Email.create('user@example.com'),
    '+19999999999',
    UserSettings.create(),
  );
}

describe('UserNotification', () => {
  it('create() emits a NotificationAccountCreatedEvent', () => {
    const aggregate = createAggregate();
    const events = aggregate.getAllEvents();
    expect(events).toHaveLength(1);
    expect(events[0]).toBeInstanceOf(NotificationAccountCreatedEvent);
  });

  it('fromPersist() does NOT emit any event (rehydration, not creation)', () => {
    const aggregate = UserNotification.fromPersist(
      new UserId('11111111-1111-1111-1111-111111111111'),
      Email.create('user@example.com'),
      '+19999999999',
      UserSettings.create(),
    );
    expect(aggregate.getAllEvents()).toHaveLength(0);
  });

  it('changePhoneNumber() updates phoneNumber and emits PhoneNumberChangedEvent', () => {
    const aggregate = createAggregate();
    aggregate.changePhoneNumber('+10000000000');

    expect(aggregate.phoneNumber).toBe('+10000000000');
    const events = aggregate.getAllEvents();
    const phoneEvent = events.find(
      (event) => event instanceof PhoneNumberChangedEvent,
    ) as PhoneNumberChangedEvent;
    expect(phoneEvent).toBeInstanceOf(PhoneNumberChangedEvent);
    expect(phoneEvent.newPhoneNumber).toBe('+10000000000');
  });

  it('enableSetting()/disableSetting() change settings via the VO', () => {
    const aggregate = createAggregate();
    aggregate.disableSetting('receive_phone_notifications');
    expect(aggregate.isSettingEnabled('receive_phone_notifications')).toBe(
      false,
    );

    aggregate.enableSetting('receive_phone_notifications');
    expect(aggregate.isSettingEnabled('receive_phone_notifications')).toBe(
      true,
    );
  });

  it('enableAllNotifications()/disableAllNotifications() flip every setting', () => {
    const aggregate = createAggregate();
    aggregate.disableAllNotifications();
    expect(
      Object.values(aggregate.settings.toPlain()).every((value) => !value),
    ).toBe(true);

    aggregate.enableAllNotifications();
    expect(Object.values(aggregate.settings.toPlain()).every(Boolean)).toBe(
      true,
    );
  });

  it('isSettingEnabled() reflects the current settings VO', () => {
    const aggregate = createAggregate();
    expect(aggregate.isSettingEnabled('receive_email_notifications')).toBe(
      true,
    );
    aggregate.disableSetting('receive_email_notifications');
    expect(aggregate.isSettingEnabled('receive_email_notifications')).toBe(
      false,
    );
  });
});
