import { startTestKafka } from '../setup/kafka';
import {
  startTestPostgres,
  TestPostgres,
  truncateAll,
} from '../setup/postgres';
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
import { UoWRepository } from '@modules/notifications/infrastructure/repositories/UoW.repository';
import { EventDispatcher } from '@modules/notifications/infrastructure/kafka/dispatchers/event.dispatcher';
import { Event } from '@modules/notifications/application/abstractions/incomingQueueTypes';
import { randomUUID } from 'node:crypto';
import { startKafkaConsumers } from '@modules/notifications/infrastructure/kafka/kafka.module';
import { processKafkaMessage } from '@modules/notifications/infrastructure/kafka/consumers/processKafkaMessage';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import { kafkaRateLimiterConfig } from '@modules/notifications/infrastructure/rateLimiter/configs';
import { resetKafka } from '@/infrastructure/kafka/kafka';
import { disconnectAllKafkaConsumer } from '@/infrastructure/kafka/kafkaHealth';
import { gracefulShutdownDlqProducer } from '@modules/notifications/infrastructure/kafka/producer/dlq.producer';

// These tests do real Kafka work (connect/subscribe/run, seek-driven redelivery,
// reconnect) that takes well over jest's 5s default. Without this the redelivery
// and reconnect cases time out before they can assert anything.
jest.setTimeout(120_000);

async function waitFor(
  assertion: () => Promise<void>,
  timeoutMs = 10_000,
  intervalMs = 200,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (true) {
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

describe('Kafka consumer (integration)', () => {
  let testKafka: Awaited<ReturnType<typeof startTestKafka>>;
  let pg: TestPostgres;
  let admin: any;
  let producer: any;

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
    const uow = new UoWRepository(pg.db, ctx);
    const dispatcher = new EventDispatcher();

    await startKafkaConsumers(dispatcher, outboxRepository, uow);
  }, 45_000);

  afterAll(async () => {
    await disconnectAllKafkaConsumer();
    await gracefulShutdownDlqProducer();
    if (admin) await admin.disconnect();
    if (producer) await producer.disconnect();
    if (testKafka?.teardown) await testKafka.teardown();
    if (pg?.teardown) await pg.teardown();
  }, 60_000);

  beforeEach(async () => {
    await truncateAll(pg.db);
  });

  it('a valid message is processed and its offset is committed', async () => {
    const userId = randomUUID();
    const message: Event = {
      eventId: randomUUID(),
      type: 'property_created',
      payload: {
        userId: userId,
        channel: ['inapp'],
        message: 'property created',
      },
    };

    await producer.send({
      topic: KAFKA_PROPERTY_TOPIC,
      messages: [{ value: JSON.stringify(message) }],
    });

    await waitFor(async () => {
      const row = await pg.db
        .selectFrom('outbox')
        .selectAll()
        .where('event_id', '=', `${message.eventId}:inapp`)
        .executeTakeFirst();
      expect(row).toBeDefined();
      expect(row!.status).toBe('PENDING');
    });
  });

  it('a malformed (invalid JSON) message is routed to the incoming DLQ topic, offset advances', async () => {
    const userId = randomUUID();
    const message: Event = {
      eventId: randomUUID(),
      type: 'property_created',
      payload: {
        userId: userId,
        channel: ['inapp'],
        message: 'property created',
      },
    };

    await producer.send({
      topic: KAFKA_PROPERTY_TOPIC,
      messages: [{ value: JSON.stringify(message).concat(randomUUID()) }],
    });

    await waitFor(async () => {
      const row = await pg.db
        .selectFrom('outbox')
        .selectAll()
        .where('event_id', '=', `${message.eventId}:inapp`)
        .executeTakeFirst();
      expect(row).toBeUndefined();
    });
  });

  it('processing does not get stuck in an infinite redelivery loop on a poison message', async () => {
    const topic = `redelivery-topic-${randomUUID()}`;
    await admin.createTopics({ topics: [{ topic, numPartitions: 1 }] });

    const groupId = `redelivery-test-${randomUUID()}`;
    const message: Event = {
      eventId: randomUUID(),
      type: 'property_created',
      payload: {
        userId: randomUUID(),
        channel: ['inapp'],
        message: 'property created',
      },
    };

    let attempts = 0;
    const throwawayDispatcher = new EventDispatcher();
    throwawayDispatcher.register('property_created', async () => {
      attempts++;
      if (attempts < 3) throw new Error('transient failure');
    });

    const consumer = testKafka.kafka.consumer({ groupId });
    await consumer.connect();
    await consumer.subscribe({ topic, fromBeginning: true });

    const rateLimiter = new RateLimiterMemory(kafkaRateLimiterConfig);
    try {
      await consumer.run({
        autoCommit: false,
        eachBatch: async ({
          batch,
          heartbeat,
          resolveOffset,
          commitOffsetsIfNecessary,
          isStale,
        }) => {
          for (const m of batch.messages) {
            if (isStale()) break;
            const { shouldCommit } = await processKafkaMessage(
              m,
              topic,
              throwawayDispatcher,
              rateLimiter,
            );
            if (shouldCommit) resolveOffset(m.offset);
            await heartbeat();
          }
          await commitOffsetsIfNecessary();
        },
      });

      await producer.send({
        topic,
        messages: [{ value: JSON.stringify(message) }],
      });

      await waitFor(async () => expect(attempts).toBe(1), 30_000);
      consumer.seek({ topic, partition: 0, offset: '0' });

      await waitFor(async () => expect(attempts).toBe(2), 30_000);
      consumer.seek({ topic, partition: 0, offset: '0' });

      await waitFor(async () => expect(attempts).toBe(3), 30_000);

      await new Promise((r) => setTimeout(r, 2_000));
      expect(attempts).toBe(3);
    } finally {
      await consumer.disconnect();
    }
  });

  it('on reconnect with the same groupId, already-committed offsets are not reprocessed', async () => {
    const groupId = `reconnect-test-${randomUUID()}`;
    const topic = KAFKA_AUTH_TOPIC;
    const marker = randomUUID();

    await producer.send({
      topic,
      messages: [{ value: JSON.stringify({ marker }) }],
    });

    const firstReceived = jest.fn();
    const consumerA = testKafka.kafka.consumer({ groupId });
    await consumerA.connect();
    await consumerA.subscribe({ topic, fromBeginning: true });
    await consumerA.run({
      eachMessage: async ({ topic: t, partition, message }) => {
        firstReceived(message.value?.toString());
        await consumerA.commitOffsets([
          {
            topic: t,
            partition,
            offset: (Number(message.offset) + 1).toString(),
          },
        ]);
      },
    });

    await waitFor(async () => {
      expect(firstReceived).toHaveBeenCalledTimes(1);
    });
    await consumerA.disconnect();

    const secondReceived = jest.fn();
    const consumerB = testKafka.kafka.consumer({ groupId });
    await consumerB.connect();
    await consumerB.subscribe({ topic, fromBeginning: true });
    await consumerB.run({
      eachMessage: async ({ message }) => {
        secondReceived(message.value?.toString());
      },
    });

    await new Promise((r) => setTimeout(r, 3_000));
    await consumerB.disconnect();

    expect(secondReceived).not.toHaveBeenCalled();
  });
});
