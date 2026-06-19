import {
  AccountCreatedPayload,
  SingleRecipientPayload,
} from './kafka.message.interface';

export const userEventNames = {
  able_to_leave_review: 'able_to_leave_review',
  account_created: 'account_created',
  new_role_received: 'new_role_received',
} as const;

export type UserEventName =
  (typeof userEventNames)[keyof typeof userEventNames];

export type UserEvent =
  | {
      type: typeof userEventNames.able_to_leave_review;
      payload: SingleRecipientPayload;
    }
  | {
      type: typeof userEventNames.account_created;
      payload: AccountCreatedPayload;
    }
  | {
      type: typeof userEventNames.new_role_received;
      payload: SingleRecipientPayload;
    };
