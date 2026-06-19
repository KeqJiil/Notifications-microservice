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

export interface AccountCreatedPayload {
  userId: string;
  email: string;
  phoneNumber: string;
  settings: {
    receive_phone_notifications: boolean;
    receive_email_notifications: boolean;
    receive_notifications: boolean;
    receive_important_messages: boolean;
    receive_not_important_messages: boolean;
  };
}
