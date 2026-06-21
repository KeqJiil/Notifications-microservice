import { EventType } from '@modules/notifications/application/abstractions/incomingQueueTypes';
import { NotificationPayloadOfKind } from '@modules/notifications/application/abstractions/notifications/NotificationPayload';
import { EmailContent } from '@modules/notifications/infrastructure/notification-strategies/templates/email/EmailContent.interface';

const subjectByEventType: Partial<Record<EventType, string>> = {
  password_changed: 'Your password was changed',
  forgot_password: 'Reset your password',
  account_need_confirmation: 'Please confirm your account',
  chat_created: 'You have a new chat',
  able_to_leave_review: 'You can now leave a review',
  new_role_received: 'Your role has changed',
  new_review_received: 'You received a new review',
  new_review_created: 'Your review was published',
  review_edited: 'A review was edited',
  property_created: 'Your property was created',
  property_changed: 'Your property was updated',
  property_deleted: 'Your property was deleted',
  property_images_updated: 'Your property images were updated',
  property_images_added: 'New images were added to your property',
  property_images_deleted: 'Images were removed from your property',
  booking_created: 'A new booking was created',
  booking_paid: 'Your booking was paid',
  booking_expired: 'Your booking has expired',
  booking_rejected: 'Your booking was rejected',
  booking_cancelled: 'Your booking was cancelled',
  booking_confirmed: 'Your booking was confirmed',
  booking_completed: 'Your booking was completed',
  billing_refund: 'Your refund has been processed',
};

export function renderMessageEmail(notification: NotificationPayloadOfKind<'message'>): EmailContent {
  const subject = subjectByEventType[notification.type] ?? 'Notification from Booking';
  return {
    subject,
    html: `<p>${notification.message}</p>`,
  };
}
