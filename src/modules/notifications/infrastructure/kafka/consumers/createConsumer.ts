import { kafka } from '@/infrastructure/kafka/kafka';
import { trackConsumerHealth } from '@/infrastructure/kafka/kafkaHealth';
import { EventDispatcher } from '@modules/notifications/infrastructure/kafka/dispatchers/event.dispatcher';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import { kafkaRateLimiterConfig } from '@modules/notifications/infrastructure/rateLimiter/configs';
import { processKafkaMessage } from '@modules/notifications/infrastructure/kafka/consumers/processKafkaMessage';

interface ConsumerOptions {
  topic: string;
  groupId: string;
  dispatcher: EventDispatcher;
}

export async function createKafkaConsumer({
  topic,
  groupId,
  dispatcher,
}: ConsumerOptions): Promise<void> {
  const consumer = kafka.consumer({ groupId });
  trackConsumerHealth(groupId, consumer);

  await consumer.connect();
  await consumer.subscribe({ topic, fromBeginning: false });

  const rateLimiter = new RateLimiterMemory(kafkaRateLimiterConfig);

  await consumer.run({
    autoCommit: false,
    eachBatch: async ({
      batch,
      heartbeat,
      resolveOffset,
      commitOffsetsIfNecessary,
      isStale,
    }) => {
      for (const message of batch.messages) {
        if (isStale()) break;

        const { shouldCommit, shouldStopBatch } = await processKafkaMessage(
          message,
          topic,
          dispatcher,
          rateLimiter,
        );

        if (shouldCommit) resolveOffset(message.offset);
        await heartbeat();
        if (shouldStopBatch) break;
      }

      await commitOffsetsIfNecessary();
    },
  });
}
