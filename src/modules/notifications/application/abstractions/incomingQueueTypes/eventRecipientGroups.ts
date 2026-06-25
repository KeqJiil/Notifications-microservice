import { EventType } from '@modules/notifications/application/abstractions/incomingQueueTypes/index';
import { bookingEventNames } from '@modules/notifications/application/abstractions/incomingQueueTypes/booking.types';
import { userEventNames } from '@modules/notifications/application/abstractions/incomingQueueTypes/user.types';

export const DUAL_RECIPIENT_EVENT_TYPES: EventType[] = [
  bookingEventNames.booking_created,
  bookingEventNames.booking_rejected,
  bookingEventNames.booking_cancelled,
  bookingEventNames.booking_confirmed,
  bookingEventNames.booking_completed,
];

export const ACCOUNT_CREATED_EVENT_TYPES: EventType[] = [
  userEventNames.account_created,
];
