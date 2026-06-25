import {
  accountCreatedPayloadSchema,
  dualRecipientPayloadSchema,
  eventEnvelopeSchema,
  getPayloadSchema,
  singleRecipientPayloadSchema,
} from '@modules/notifications/application/abstractions/incomingQueueTypes/event.schema';

describe('event.schema', () => {
  describe('eventEnvelopeSchema', () => {
    it('accepts a known event type from the EventNames lists', () => {
      const result = eventEnvelopeSchema.safeParse({
        eventId: 'evt-1',
        type: 'password_changed',
        payload: { userId: 'user-1', channel: ['email'], message: 'hi' },
      });

      expect(result.success).toBe(true);
    });

    it('rejects an unknown/typo event type (this is what routes it to DLQ)', () => {
      const result = eventEnvelopeSchema.safeParse({
        eventId: 'evt-1',
        type: 'passwrod_changed',
        payload: {},
      });

      expect(result.success).toBe(false);
    });

    it('rejects when eventId is missing', () => {
      const result = eventEnvelopeSchema.safeParse({
        type: 'password_changed',
        payload: {},
      });

      expect(result.success).toBe(false);
    });
  });

  describe('getPayloadSchema', () => {
    it('returns dualRecipient schema for booking_created', () => {
      expect(getPayloadSchema('booking_created')).toBe(
        dualRecipientPayloadSchema,
      );
    });

    it('returns accountCreated schema for account_created', () => {
      expect(getPayloadSchema('account_created')).toBe(
        accountCreatedPayloadSchema,
      );
    });

    it('returns singleRecipient schema for a default type (e.g. password_changed)', () => {
      expect(getPayloadSchema('password_changed')).toBe(
        singleRecipientPayloadSchema,
      );
    });
  });

  describe('payload schemas', () => {
    it('singleRecipient rejects a payload missing message', () => {
      const result = singleRecipientPayloadSchema.safeParse({
        userId: 'user-1',
        channel: ['email'],
      });

      expect(result.success).toBe(false);
    });

    it('singleRecipient rejects a channel value not in [sms,email,inapp]', () => {
      const result = singleRecipientPayloadSchema.safeParse({
        userId: 'user-1',
        channel: ['push'],
        message: 'hi',
      });

      expect(result.success).toBe(false);
    });

    it('dualRecipient requires both hostUserId and guestUserId', () => {
      const result = dualRecipientPayloadSchema.safeParse({
        hostUserId: 'host-1',
        channel: ['email'],
        message: 'hi',
      });

      expect(result.success).toBe(false);
    });

    it('accountCreated rejects an invalid info', () => {
      const result = accountCreatedPayloadSchema.safeParse({
        type: 'account_created',
        userId: 'user-1',
        phoneNumber: '+10000000000',
        settings: {
          receive_phone_notifications: true,
          receive_email_notifications: true,
          receive_notifications: true,
          receive_important_messages: true,
          receive_not_important_messages: true,
        },
      });

      expect(result.success).toBe(false);
    });
  });
});
