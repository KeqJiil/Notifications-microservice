import { IPubSubService } from '@modules/notifications/application/abstractions/PubSub.interface';
import Redis from 'ioredis';
import { PubSubMessage } from '@modules/notifications/application/abstractions/PubSubMessage.interface';

export class RedisPubSubFanOutService implements IPubSubService {
  private readonly handlers = new Map<
    string,
    Set<(message: PubSubMessage) => void>
  >();

  constructor(
    private readonly publisher: Redis,
    private readonly subscriber: Redis,
  ) {
    this.subscriber.on('message', (receivedChannel: string, raw: string) => {
      const channelHandlers = this.handlers.get(receivedChannel);
      if (!channelHandlers) return;

      let parsed: PubSubMessage;
      try {
        parsed = JSON.parse(raw) as PubSubMessage;
      } catch (error) {
        return;
      }

      channelHandlers.forEach((handler) => handler(parsed));
    });
  }

  public async pub(channel: string, message: PubSubMessage): Promise<void> {
    const jsonMessage = JSON.stringify(message);
    await this.publisher.publish(channel, jsonMessage);
  }

  public async sub(
    channel: string,
    onMessage: (message: PubSubMessage) => void,
  ): Promise<void> {
    if (!this.handlers.has(channel)) {
      this.handlers.set(channel, new Set());
      await this.subscriber.subscribe(channel);
    }
    this.handlers.get(channel)!.add(onMessage);
  }

  public async unsub(
    channel: string,
    handler: (msg: PubSubMessage) => void,
  ): Promise<void> {
    const channelHandlers = this.handlers.get(channel);
    if (!channelHandlers) return;
    channelHandlers.delete(handler);
    if (channelHandlers.size === 0) {
      this.handlers.delete(channel);
      await this.subscriber.unsubscribe(channel);
    }
  }
}
