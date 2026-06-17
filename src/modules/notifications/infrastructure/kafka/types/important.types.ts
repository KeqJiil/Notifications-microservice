import { SingleRecipientPayload } from './kafka.message.interface';

export const importantEventNames = {
  forgot_password: 'forgot_password',
  account_need_confirmation: 'account_need_confirmation',
  chat_created: 'chat_created',
} as const;

export type ImportantEventName =
  (typeof importantEventNames)[keyof typeof importantEventNames];

export type ImportantEvent =
  | {
      type: typeof importantEventNames.chat_created;
      payload: SingleRecipientPayload;
    }
  | {
      type: typeof importantEventNames.forgot_password;
      payload: SingleRecipientPayload;
    }
  | {
      type: typeof importantEventNames.account_need_confirmation;
      payload: SingleRecipientPayload;
    };
