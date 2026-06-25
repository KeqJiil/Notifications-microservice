import { FastifyInstance } from 'fastify';
import { RedisPubSubFanOutService } from '@modules/notifications/infrastructure/redis/RedisPubSubFanOut.service';
import { pub, sub } from '@/infrastructure/redis/redis';
import { SSEFastifyPort } from '@modules/notifications/infrastructure/http/SSEFastifyPort';
import { FeedFastifyPort } from '@modules/notifications/infrastructure/http/FeedFastifyPort';
import { MarkNotificationsReadFastifyPort } from '@modules/notifications/infrastructure/http/MarkNotificationsReadFastifyPort';
import { FeedRepository } from '@modules/notifications/infrastructure/repositories/feed.repository';
import { startKafkaConsumers } from '@modules/notifications/infrastructure/kafka/kafka.module';
import { FanOutService } from '@modules/notifications/application/services/FanOut.service';
import { EventDispatcher } from '@modules/notifications/infrastructure/kafka/dispatchers/event.dispatcher';
import { KyselyTransactionContext } from '@modules/notifications/infrastructure/repositories/kyselyTransactionContext';
import { db } from '@/infrastructure/database/database';
import { OutboxRepository } from '@modules/notifications/infrastructure/repositories/outbox/outbox.repository';
import { InboxRepository } from '@modules/notifications/infrastructure/repositories/inbox.repository';
import { UoWRepository } from '@modules/notifications/infrastructure/repositories/UoW.repository';
import { useCasesBuilder } from '@modules/notifications/module/applicationLevel.builder';
import { UserNotificationsRepository } from '@modules/notifications/infrastructure/repositories/userNotifications.repository';
import { OutboxPoller } from '@modules/notifications/infrastructure/repositories/outbox/OutboxPoller';
import { OUTBOX_POLLER_TIMEOUT } from '@/common/consts/outboxConsts';
import { disconnectAllKafkaConsumer } from '@/infrastructure/kafka/kafkaHealth';
import { gracefulShutdownDlqProducer } from '@modules/notifications/infrastructure/kafka/producer/dlq.producer';

export async function buildNotificationsModule(app: FastifyInstance) {
  const redisPubSub = new RedisPubSubFanOutService(pub, sub);
  const fanOutService = new FanOutService(redisPubSub);
  const httpSSE = new SSEFastifyPort(redisPubSub);

  const kyselyTxContext = new KyselyTransactionContext();
  const outboxRepository = new OutboxRepository(db, kyselyTxContext);
  const inboxRepository = new InboxRepository(db, kyselyTxContext);
  const feedRepository = new FeedRepository(db, kyselyTxContext);
  const feedHttp = new FeedFastifyPort(feedRepository);
  const markNotificationsReadHttp = new MarkNotificationsReadFastifyPort(
    feedRepository,
  );
  const uow = new UoWRepository(db, kyselyTxContext);
  const userRepo = new UserNotificationsRepository(db, kyselyTxContext);

  const useCasesDispatcher = useCasesBuilder(
    fanOutService,
    inboxRepository,
    userRepo,
    feedRepository,
  );

  const outboxPoller = new OutboxPoller(useCasesDispatcher, outboxRepository);

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
  app.get(`/notifications/feed`, feedHttp.handle.bind(feedHttp));
  app.patch(
    `/notifications/read`,
    markNotificationsReadHttp.handle.bind(markNotificationsReadHttp),
  );

  outboxPoller.start(OUTBOX_POLLER_TIMEOUT);

  app.addHook('onClose', async () => {
    await outboxPoller.stop();
    await disconnectAllKafkaConsumer();
    await gracefulShutdownDlqProducer();
    await db.destroy();
    await pub.quit();
    await sub.quit();
  });
}
