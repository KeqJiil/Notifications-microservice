import { PubSubMessage } from '@modules/notifications/application/abstractions/PubSubMessage.interface';

export interface IFanOutService {
  apply(message: PubSubMessage): void;
  pushAll(): Promise<void>;
  pushOne(message: PubSubMessage): Promise<void>;
}
