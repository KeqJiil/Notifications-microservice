import { SingleRecipientPayload } from './message.interface';

export const propertyEventNames = {
  property_created: 'property_created',
  property_changed: 'property_changed',
  property_deleted: 'property_deleted',
  property_images_updated: 'property_images_updated',
  property_images_added: 'property_images_added',
  property_images_deleted: 'property_images_deleted',
} as const;

export type PropertyEventName =
  (typeof propertyEventNames)[keyof typeof propertyEventNames];

export type PropertyEvent =
  | {
      type: typeof propertyEventNames.property_created;
      payload: SingleRecipientPayload;
    }
  | {
      type: typeof propertyEventNames.property_changed;
      payload: SingleRecipientPayload;
    }
  | {
      type: typeof propertyEventNames.property_deleted;
      payload: SingleRecipientPayload;
    }
  | {
      type: typeof propertyEventNames.property_images_updated;
      payload: SingleRecipientPayload;
    }
  | {
      type: typeof propertyEventNames.property_images_added;
      payload: SingleRecipientPayload;
    }
  | {
      type: typeof propertyEventNames.property_images_deleted;
      payload: SingleRecipientPayload;
    };
