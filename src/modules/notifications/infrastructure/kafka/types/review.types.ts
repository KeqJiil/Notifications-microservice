import { SingleRecipientPayload } from './kafka.message.interface';

export const reviewEventNames = {
  new_review_received: 'new_review_received',
  new_review_created:  'new_review_created',
  review_edited:       'review_edited',
} as const;

export type ReviewEventName = (typeof reviewEventNames)[keyof typeof reviewEventNames];

export type ReviewEvent =
  | { type: typeof reviewEventNames.new_review_received; payload: SingleRecipientPayload }
  | { type: typeof reviewEventNames.new_review_created;  payload: SingleRecipientPayload }
  | { type: typeof reviewEventNames.review_edited;       payload: SingleRecipientPayload }
