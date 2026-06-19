import { FastifyReply, FastifyRequest } from 'fastify';
import { ISSEService } from '@modules/notifications/infrastructure/http/SSEService.interface';
import { CHANNEL_NAME } from '@/common/consts/PubSub.consts';
import { PubSubMessage } from '@modules/notifications/application/abstractions/PubSubMessage.interface';
import { IPubSubService } from '@modules/notifications/application/abstractions/PubSub.interface';

export class SSEFastifyPort implements ISSEService {
  constructor(private readonly pubSub: IPubSubService) {}

  async handle(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const userId = request.user.userId;
    const channel = CHANNEL_NAME(userId);

    const headers = {
      'Content-Type': 'text/event-stream',
      Connection: 'keep-alive',
      'Cache-Control': 'no-cache',
    };
    reply.raw.writeHead(200, headers);

    const handler = (message: PubSubMessage) => {
      reply.raw.write(`data: ${JSON.stringify(message)}`);
    };

    await this.pubSub.sub(channel, handler);
    request.raw.on('close', async () => {
      await this.pubSub.unsub(channel, handler);
    });
  }
}
