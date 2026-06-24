import { kafka } from '@/infrastructure/kafka/kafka';
import { trackConsumerHealth } from '@/infrastructure/kafka/kafkaHealth';
import { EventDispatcher } from '@modules/notifications/infrastructure/kafka/dispatchers/event.dispatcher';
import { Event } from '@modules/notifications/application/abstractions/incomingQueueTypes';
import { logger } from '@/app/logger';
import { NonRetryableException } from '@/common/errors/NonRetryable.exception';
import { sendToDlqProducer } from '@modules/notifications/infrastructure/kafka/producer/dlq.producer';
import {
  KAFKA_CONSUMER_RETRY_DELAY_MS,
  KAFKA_INCOMING_DLQ_TOPIC,
} from '@/common/consts/infrastucture.consts';

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

        if (message.value === null) {
          resolveOffset(message.offset);
          await heartbeat();
          continue;
        }

        try {
          const event = JSON.parse(message.value.toString()) as Event;
          await dispatcher.process(event.type, event);
        } catch (err) {
          const isNonRetryable =
            err instanceof SyntaxError || err instanceof NonRetryableException;
          if (isNonRetryable) {
            logger.error(
              `[Kafka] Non-retryable, sending to DLQ. Topic "${topic}" offset ${message.offset}:`,
            );

            await sendToDlqProducer([message], KAFKA_INCOMING_DLQ_TOPIC);
            resolveOffset(message.offset);
            await heartbeat();
            continue;
          }
          logger.error(
            `[Kafka] Retryable failure, will redeliver. Topic "${topic}" offset ${message.offset}:`,
          );
          await new Promise((resolve) =>
            setTimeout(resolve, KAFKA_CONSUMER_RETRY_DELAY_MS),
          );
          break;
        }

        resolveOffset(message.offset);
        await heartbeat();
      }

      await commitOffsetsIfNecessary();
    },
  });
}
