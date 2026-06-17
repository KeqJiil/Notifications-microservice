import { SingleRecipientPayload } from './kafka.message.interface';

export const authEventNames = {
  password_changed: 'password_changed',
} as const;

export type AuthEventName =
  (typeof authEventNames)[keyof typeof authEventNames];

export type AuthEvent = {
  type: typeof authEventNames.password_changed;
  payload: SingleRecipientPayload;
};
