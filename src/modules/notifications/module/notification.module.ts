import { FastifyInstance } from 'fastify';
import { RedisPubSubFanOutService } from '@modules/notifications/infrastructure/redis/RedisPubSubFanOut.service';
import { pub, sub } from '@/infrastructure/redis/redis';
import { SSEFastifyPort } from '@modules/notifications/infrastructure/http/SSEFastifyPort';
import { startKafkaConsumers } from '@modules/notifications/infrastructure/kafka/kafka.module';
import { FanOutService } from '@modules/notifications/application/services/FanOut.service';
import { EventDispatcher } from '@modules/notifications/infrastructure/kafka/dispatchers/event.dispatcher';
import { KyselyTransactionContext } from '@modules/notifications/infrastructure/repositories/kyselyTransactionContext';
import { db } from '@/infrastructure/database/database';
import { OutboxRepository } from '@modules/notifications/infrastructure/repositories/outbox/outbox.repository';
import { InboxRepository } from '@modules/notifications/infrastructure/repositories/inbox.repository';
import { UoWRepository } from '@modules/notifications/infrastructure/repositories/UoW.repository';

export async function buildNotificationsModule(app: FastifyInstance) {
  const redisPubSub = new RedisPubSubFanOutService(pub, sub);
  const fanOutService = new FanOutService(redisPubSub);
  const httpSSE = new SSEFastifyPort(redisPubSub);

  const kyselyTxContext = new KyselyTransactionContext();
  const outboxRepository = new OutboxRepository(db, kyselyTxContext);
  const inboxRepository = new InboxRepository(db, kyselyTxContext);
  const uow = new UoWRepository(db, kyselyTxContext);

  const eventDispatcher = new EventDispatcher();
  await startKafkaConsumers(eventDispatcher, outboxRepository, uow);
  app.addHook('preHandler', async (request, reply) => {
    const userId = request.headers['x-user-id'];
    const role = request.headers['x-user-role'];
    if (!userId || !role) {
      reply.status(401).send({ message: 'Unauthorized' });
      return;
    }

    request.user = {
      userId: userId as string,
      role: role as string,
    };
  });
  app.get(`/notifications`, httpSSE.handle.bind(httpSSE));
}
