import { DualRecipientPayload, SingleRecipientPayload } from './kafka.message.interface';

export const bookingEventNames = {
  booking_created:   'booking_created',
  booking_paid:      'booking_paid',
  booking_expired:   'booking_expired',
  booking_rejected:  'booking_rejected',
  booking_cancelled: 'booking_cancelled',
  booking_confirmed: 'booking_confirmed',
  booking_completed: 'booking_completed',
} as const;

export type BookingEventName = (typeof bookingEventNames)[keyof typeof bookingEventNames];

export type BookingEvent =
  | { type: typeof bookingEventNames.booking_created;   payload: DualRecipientPayload }
  | { type: typeof bookingEventNames.booking_paid;      payload: SingleRecipientPayload }
  | { type: typeof bookingEventNames.booking_expired;   payload: SingleRecipientPayload }
  | { type: typeof bookingEventNames.booking_rejected;  payload: DualRecipientPayload }
  | { type: typeof bookingEventNames.booking_cancelled; payload: DualRecipientPayload }
  | { type: typeof bookingEventNames.booking_confirmed; payload: DualRecipientPayload }
  | { type: typeof bookingEventNames.booking_completed; payload: DualRecipientPayload }
