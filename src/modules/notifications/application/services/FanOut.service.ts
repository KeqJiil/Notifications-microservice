import { IFanOutService } from '@modules/notifications/application/abstractions/FanOutService.interface';
import { IPubSubService } from '@modules/notifications/application/abstractions/PubSub.interface';
import { CHANNEL_NAME } from '@/common/consts/PubSub.consts';
import { PubSubMessage } from '@modules/notifications/application/abstractions/PubSubMessage.interface';

export class FanOutService implements IFanOutService {
  private _messages: PubSubMessage[] = [];
  constructor(private readonly pubSub: IPubSubService) {}

  apply(message: PubSubMessage): void {
    this._messages.push(message);
  }

  async pushAll(): Promise<void> {
    const messages = this._messages;
    this._messages = [];
    for (const message of messages) {
      await this.pubSub.pub(CHANNEL_NAME(message.userId), message);
    }
  }

  async pushOne(message: PubSubMessage): Promise<void> {
    await this.pubSub.pub(CHANNEL_NAME(message.userId), message);
  }
}
