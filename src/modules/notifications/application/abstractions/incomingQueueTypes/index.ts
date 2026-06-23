import { AuthEvent, authEventNames } from './auth.types';
import { UserEvent, userEventNames } from './user.types';
import { PropertyEvent, propertyEventNames } from './property.types';
import { ReviewEvent, reviewEventNames } from './review.types';
import { BookingEvent, bookingEventNames } from './booking.types';
import { BillingEvent, billingEventNames } from './billing.types';
import { ImportantEvent, importantEventNames } from './important.types';

export * from './message.interface';
export * from './auth.types';
export * from './user.types';
export * from './property.types';
export * from './review.types';
export * from './booking.types';
export * from './billing.types';
export * from './important.types';

export type Event = (
  | AuthEvent
  | UserEvent
  | PropertyEvent
  | ReviewEvent
  | BookingEvent
  | BillingEvent
  | ImportantEvent
) & { eventId: string };

export type EventType = Event['type'];

export const DEFAULT_MESSAGE_EVENT_TYPES: EventType[] = [
  authEventNames.password_changed,

  userEventNames.able_to_leave_review,
  userEventNames.new_role_received,

  importantEventNames.chat_created,
  importantEventNames.forgot_password,
  importantEventNames.account_need_confirmation,

  reviewEventNames.new_review_received,
  reviewEventNames.new_review_created,
  reviewEventNames.review_edited,

  bookingEventNames.booking_created,
  bookingEventNames.booking_paid,
  bookingEventNames.booking_expired,
  bookingEventNames.booking_rejected,
  bookingEventNames.booking_cancelled,
  bookingEventNames.booking_confirmed,
  bookingEventNames.booking_completed,

  billingEventNames.billing_refund,

  propertyEventNames.property_created,
  propertyEventNames.property_changed,
  propertyEventNames.property_deleted,
  propertyEventNames.property_images_updated,
  propertyEventNames.property_images_added,
  propertyEventNames.property_images_deleted,
];
