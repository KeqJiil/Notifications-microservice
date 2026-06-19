import { SingleRecipientPayload } from './kafka.message.interface';

export const billingEventNames = {
  billing_refund: 'billing_refund',
} as const;

export type BillingEventName = (typeof billingEventNames)[keyof typeof billingEventNames];

export type BillingEvent =
  | { type: typeof billingEventNames.billing_refund; payload: SingleRecipientPayload }
