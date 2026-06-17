import { KafkaEventType } from '@modules/notifications/infrastructure/kafka/types/index';

export interface KafkaEventEnvelope<T = unknown> {
  type: KafkaEventType;
  occurredAt: string;
  payload: T;
}

export interface SingleRecipientPayload {
  userId: string;
  channel: 'sms' | 'email' | 'inapp';
  message: string;
}

export interface DualRecipientPayload {
  hostUserId: string;
  guestUserId: string;
  channel: 'sms' | 'email' | 'inapp';
  message: string;
}

export interface ReservationPayload {
  userId: string;
  channel: 'email';
  bookingId: string;
  checkIn: string;
  checkOut: string;
  propertyName: string;
}
