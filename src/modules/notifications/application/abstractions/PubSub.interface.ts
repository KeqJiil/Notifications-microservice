import { PubSubMessage } from '@modules/notifications/application/abstractions/PubSubMessage.interface';

export interface IPubSubService {
  pub(channel: string, message: PubSubMessage): Promise<void>;
  sub(
    channel: string,
    onMessage: (message: PubSubMessage) => void,
  ): Promise<void>;
  unsub(channel: string, handler: (msg: PubSubMessage) => void): Promise<void>;
}
