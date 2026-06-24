import { FastifyReply, FastifyRequest } from 'fastify';
import { ISSEService } from '@modules/notifications/infrastructure/http/SSEService.interface';
import { CHANNEL_NAME, SSE_SEEN_MAX } from '@/common/consts/PubSub.consts';
import { PubSubMessage } from '@modules/notifications/application/abstractions/PubSubMessage.interface';
import { IPubSubService } from '@modules/notifications/application/abstractions/PubSub.interface';

export class SSEFastifyPort implements ISSEService {
  constructor(private readonly pubSub: IPubSubService) {}

  async handle(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const userId = request.user.userId;
    const channel = CHANNEL_NAME(userId);
    const seen = new Set<string>();

    const headers = {
      'Content-Type': 'text/event-stream',
      Connection: 'keep-alive',
      'Cache-Control': 'no-cache',
    };
    reply.raw.writeHead(200, headers);

    const handler = (message: PubSubMessage) => {
      if (seen.has(message.idempotencyKey)) return;

      if (seen.size >= SSE_SEEN_MAX) {
        const oldest = seen.keys().next().value;
        if (oldest !== undefined) seen.delete(oldest);
      }
      seen.add(message.idempotencyKey);

      reply.raw.write(`data: ${JSON.stringify(message)}\n\n`);
    };

    await this.pubSub.sub(channel, handler);
    request.raw.on('close', () => {
      void this.pubSub.unsub(channel, handler);
    });
  }
}
