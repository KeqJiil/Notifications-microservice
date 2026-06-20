export type IChannelTypes = 'sms' | 'email' | 'inapp';

export interface SingleRecipientPayload {
  userId: string;
  channel: IChannelTypes[];
  message: string;
}

export interface DualRecipientPayload {
  hostUserId: string;
  guestUserId: string;
  channel: IChannelTypes[];
  message: string;
}

export interface ReservationPayload {
  userId: string;
  channel: Exclude<IChannelTypes, 'sms' | 'inapp'>;
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
