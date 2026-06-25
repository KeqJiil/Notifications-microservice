import { UserSettings } from '@modules/notifications/domain/VO/UserSettings.VO';

describe('UserSettings', () => {
  it('create() defaults every setting to true', () => {
    const vo = UserSettings.create();
    expect(Object.values(vo.toPlain()).every(Boolean)).toBe(true);
  });

  it('create(overrides) applies overrides on top of the defaults', () => {
    const vo = UserSettings.create({ receive_phone_notifications: false });
    expect(vo.toPlain().receive_phone_notifications).toBe(false);
  });

  it('enable(key) returns a new instance with that key true (original unchanged)', () => {
    const vo = UserSettings.create({ receive_phone_notifications: false });
    const newInst = vo.enable('receive_phone_notifications');
    expect(newInst).not.toEqual(vo);
    expect(newInst.isEnabled('receive_phone_notifications')).toBe(true);
  });

  it('disable(key) returns a new instance with that key false (original unchanged)', () => {
    const vo = UserSettings.create();
    const newInst = vo.disable('receive_phone_notifications');
    expect(newInst).not.toEqual(vo);
    expect(newInst.isEnabled('receive_phone_notifications')).toBe(false);
  });

  it('turnOnAll() enables every key', () => {
    const vo = UserSettings.create().turnOffAll();
    const newInst = vo.turnOnAll();
    expect(Object.values(newInst.toPlain()).every(Boolean)).toBe(true);
  });

  it('turnOffAll() disables every key', () => {
    const vo = UserSettings.create();
    const newInst = vo.turnOffAll();
    expect(Object.values(newInst.toPlain()).every((value) => !value)).toBe(
      true,
    );
  });

  it('isEnabled(key) reflects the current state', () => {
    const vo = UserSettings.create({ receive_phone_notifications: false });
    expect(vo.isEnabled('receive_phone_notifications')).toBe(false);
    expect(vo.isEnabled('receive_email_notifications')).toBe(true);
  });

  it('equals() is true for same flags, false when any differs', () => {
    const a = UserSettings.create();
    const b = UserSettings.create();
    const c = UserSettings.create({ receive_phone_notifications: false });
    expect(a.equals(b)).toBe(true);
    expect(a.equals(c)).toBe(false);
  });

  it('toPlain() returns a copy, not the internal frozen object', () => {
    const vo = UserSettings.create();
    const plain = vo.toPlain();
    plain.receive_phone_notifications = false;
    expect(vo.isEnabled('receive_phone_notifications')).toBe(true);
  });
});
