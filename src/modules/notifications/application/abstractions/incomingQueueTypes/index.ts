export * from './message.interface';
export * from './auth.types';
export * from './user.types';
export * from './property.types';
export * from './review.types';
export * from './booking.types';
export * from './billing.types';
export * from './important.types';

import { AuthEvent } from './auth.types';
import { UserEvent } from './user.types';
import { PropertyEvent } from './property.types';
import { ReviewEvent } from './review.types';
import { BookingEvent } from './booking.types';
import { BillingEvent } from './billing.types';
import { ImportantEvent } from './important.types';

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
