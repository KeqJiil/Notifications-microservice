import { randomUUID } from 'node:crypto';
import { startTestKafka } from '../../integration/setup/kafka';
import {
  startTestPostgres,
  TestPostgres,
  truncateAll,
} from '../../integration/setup/postgres';
import {
  KAFKA_AUTH_TOPIC,
  KAFKA_BILLING_TOPIC,
  KAFKA_BOOKINGS_TOPIC,
  KAFKA_DLQ_TOPIC,
  KAFKA_IMPORTANT_TOPIC,
  KAFKA_INCOMING_DLQ_TOPIC,
  KAFKA_PROPERTY_TOPIC,
  KAFKA_REVIEW_TOPIC,
  KAFKA_USER_TOPIC,
} from '@/common/consts/infrastucture.consts';
import { KyselyTransactionContext } from '@modules/notifications/infrastructure/repositories/kyselyTransactionContext';
import { OutboxRepository } from '@modules/notifications/infrastructure/repositories/outbox/outbox.repository';
import { InboxRepository } from '@modules/notifications/infrastructure/repositories/inbox.repository';
import { FeedRepository } from '@modules/notifications/infrastructure/repositories/feed.repository';
import { UoWRepository } from '@modules/notifications/infrastructure/repositories/UoW.repository';
import { UserNotificationsRepository } from '@modules/notifications/infrastructure/repositories/userNotifications.repository';
import { EventDispatcher } from '@modules/notifications/infrastructure/kafka/dispatchers/event.dispatcher';
import { startKafkaConsumers } from '@modules/notifications/infrastructure/kafka/kafka.module';
import { useCasesBuilder } from '@modules/notifications/module/applicationLevel.builder';
import { OutboxPoller } from '@modules/notifications/infrastructure/repositories/outbox/OutboxPoller';
import { IFanOutService } from '@modules/notifications/application/abstractions/FanOutService.interface';
import { resetKafka } from '@/infrastructure/kafka/kafka';
import { disconnectAllKafkaConsumer } from '@/infrastructure/kafka/kafkaHealth';
import { gracefulShutdownDlqProducer } from '@modules/notifications/infrastructure/kafka/producer/dlq.producer';

jest.setTimeout(120_000);

async function waitFor(
  assertion: () => Promise<void>,
  timeoutMs = 30_000,
  intervalMs = 200,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    try {
      await assertion();
      return;
    } catch (err) {
      if (Date.now() > deadline) throw err;
      await new Promise((r) => setTimeout(r, intervalMs));
    }
  }
}

const ALL_TOPICS = [
  KAFKA_AUTH_TOPIC,
  KAFKA_USER_TOPIC,
  KAFKA_BOOKINGS_TOPIC,
  KAFKA_PROPERTY_TOPIC,
  KAFKA_REVIEW_TOPIC,
  KAFKA_BILLING_TOPIC,
  KAFKA_IMPORTANT_TOPIC,
  KAFKA_DLQ_TOPIC,
  KAFKA_INCOMING_DLQ_TOPIC,
];

describe('Kafka -> outbox -> poller -> feed (e2e)', () => {
  let testKafka: Awaited<ReturnType<typeof startTestKafka>>;
  let pg: TestPostgres;
  let admin: ReturnType<
    Awaited<ReturnType<typeof startTestKafka>>['kafka']['admin']
  >;
  let producer: ReturnType<
    Awaited<ReturnType<typeof startTestKafka>>['kafka']['producer']
  >;
  let feedRepository: FeedRepository;
  let outboxPoller: OutboxPoller;

  beforeAll(async () => {
    testKafka = await startTestKafka();
    pg = await startTestPostgres();

    process.env.KAFKA_BROKERS = testKafka.brokers;
    resetKafka();

    admin = testKafka.kafka.admin();
    await admin.connect();
    await admin.createTopics({
      topics: ALL_TOPICS.map((topic) => ({ topic, numPartitions: 1 })),
    });

    producer = testKafka.kafka.producer();
    await producer.connect();

    const ctx = new KyselyTransactionContext();
    const outboxRepository = new OutboxRepository(pg.db, ctx);
    const inboxRepository = new InboxRepository(pg.db, ctx);
    feedRepository = new FeedRepository(pg.db, ctx);
    const uow = new UoWRepository(pg.db, ctx);
    const userRepo = new UserNotificationsRepository(pg.db, ctx);

    const fanoutStub: IFanOutService = {
      apply: () => {},
      pushAll: async () => {},
      pushOne: async () => {},
    };

    const useCasesDispatcher = useCasesBuilder(
      fanoutStub,
      inboxRepository,
      userRepo,
      feedRepository,
    );

    outboxPoller = new OutboxPoller(useCasesDispatcher, outboxRepository);

    const eventDispatcher = new EventDispatcher();
    await startKafkaConsumers(eventDispatcher, outboxRepository, uow);

    outboxPoller.start(200);
  }, 90_000);

  afterAll(async () => {
    await outboxPoller.stop();
    await disconnectAllKafkaConsumer();
    await gracefulShutdownDlqProducer();
    if (producer) await producer.disconnect();
    if (admin) await admin.disconnect();
    if (testKafka?.teardown) await testKafka.teardown();
    if (pg?.teardown) await pg.teardown();
  }, 60_000);

  beforeEach(async () => {
    await truncateAll(pg.db);
  });

  async function seedUser(): Promise<string> {
    const userId = randomUUID();
    await pg.db
      .insertInto('user_notifications')
      .values({ user_id: userId, email: `${userId}@test.local` })
      .execute();
    return userId;
  }

  it('a produced booking_created event ends up as a feed row for each recipient', async () => {
    const hostUserId = await seedUser();
    const guestUserId = await seedUser();

    await producer.send({
      topic: KAFKA_BOOKINGS_TOPIC,
      messages: [
        {
          value: JSON.stringify({
            eventId: randomUUID(),
            type: 'booking_created',
            payload: {
              hostUserId,
              guestUserId,
              channel: ['inapp'],
              message: 'you have a new booking',
            },
          }),
        },
      ],
    });

    await waitFor(async () => {
      const host = await feedRepository.getAll(hostUserId);
      const guest = await feedRepository.getAll(guestUserId);
      expect(host.items).toHaveLength(1);
      expect(guest.items).toHaveLength(1);
    });
  });

  it('an in-app notification becomes visible via the feed repository query', async () => {
    const userId = await seedUser();

    await producer.send({
      topic: KAFKA_PROPERTY_TOPIC,
      messages: [
        {
          value: JSON.stringify({
            eventId: randomUUID(),
            type: 'property_created',
            payload: {
              userId,
              channel: ['inapp'],
              message: 'your property was created',
            },
          }),
        },
      ],
    });

    await waitFor(async () => {
      const page = await feedRepository.getAll(userId);
      expect(page.items).toHaveLength(1);
      expect(page.items[0].userId).toBe(userId);
    });
  });

  it('duplicate events (same idempotency key) produce exactly one feed row', async () => {
    const userId = await seedUser();
    const message = {
      eventId: randomUUID(),
      type: 'property_created',
      payload: {
        userId,
        channel: ['inapp'],
        message: 'duplicate delivery',
      },
    };

    await producer.send({
      topic: KAFKA_PROPERTY_TOPIC,
      messages: [
        { value: JSON.stringify(message) },
        { value: JSON.stringify(message) },
      ],
    });

    await waitFor(async () => {
      const page = await feedRepository.getAll(userId);
      expect(page.items.length).toBeGreaterThanOrEqual(1);
    });

    await new Promise((r) => setTimeout(r, 2_000));
    const page = await feedRepository.getAll(userId);
    expect(page.items).toHaveLength(1);
  });
});
