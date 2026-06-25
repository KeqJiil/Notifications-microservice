import { z } from 'zod';
import { authEventNames } from '@modules/notifications/application/abstractions/incomingQueueTypes/auth.types';
import { userEventNames } from '@modules/notifications/application/abstractions/incomingQueueTypes/user.types';
import { importantEventNames } from '@modules/notifications/application/abstractions/incomingQueueTypes/important.types';
import { reviewEventNames } from '@modules/notifications/application/abstractions/incomingQueueTypes/review.types';
import { bookingEventNames } from '@modules/notifications/application/abstractions/incomingQueueTypes/booking.types';
import { billingEventNames } from '@modules/notifications/application/abstractions/incomingQueueTypes/billing.types';
import { propertyEventNames } from '@modules/notifications/application/abstractions/incomingQueueTypes/property.types';
import {
  ACCOUNT_CREATED_EVENT_TYPES,
  DUAL_RECIPIENT_EVENT_TYPES,
} from '@modules/notifications/application/abstractions/incomingQueueTypes/eventRecipientGroups';

const channelSchema = z.enum(['sms', 'email', 'inapp']);

export const singleRecipientPayloadSchema = z.object({
  userId: z.string(),
  channel: z.array(channelSchema),
  message: z.string(),
});

export const dualRecipientPayloadSchema = z.object({
  hostUserId: z.string(),
  guestUserId: z.string(),
  channel: z.array(channelSchema),
  message: z.string(),
});

export const accountCreatedPayloadSchema = z.object({
  type: z.string(),
  userId: z.string(),
  email: z.email(),
  phoneNumber: z.string(),
  settings: z.object({
    receive_phone_notifications: z.boolean(),
    receive_email_notifications: z.boolean(),
    receive_notifications: z.boolean(),
    receive_important_messages: z.boolean(),
    receive_not_important_messages: z.boolean(),
  }),
});

const ALL_EVENT_TYPES = [
  ...Object.values(authEventNames),
  ...Object.values(userEventNames),
  ...Object.values(importantEventNames),
  ...Object.values(reviewEventNames),
  ...Object.values(bookingEventNames),
  ...Object.values(billingEventNames),
  ...Object.values(propertyEventNames),
] as [string, ...string[]];

export const eventEnvelopeSchema = z.object({
  eventId: z.string(),
  type: z.enum(ALL_EVENT_TYPES),
  payload: z.unknown(),
});

const dualRecipientEventTypes = new Set<string>(DUAL_RECIPIENT_EVENT_TYPES);
const accountCreatedEventTypes = new Set<string>(ACCOUNT_CREATED_EVENT_TYPES);

export function getPayloadSchema(type: string) {
  if (accountCreatedEventTypes.has(type)) return accountCreatedPayloadSchema;
  if (dualRecipientEventTypes.has(type)) return dualRecipientPayloadSchema;
  return singleRecipientPayloadSchema;
}
