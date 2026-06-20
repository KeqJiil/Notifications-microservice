import { kafka } from '@/infrastructure/kafka/kafka';
import { EventDispatcher } from '@modules/notifications/infrastructure/kafka/dispatchers/event.dispatcher';
import { Event } from '@modules/notifications/application/abstractions/incomingQueueTypes';

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
          console.error(
            `[Kafka] Failed to process message from topic "${topic}" offset ${message.offset}:`,
            err,
          );
        }

        resolveOffset(message.offset);
        await heartbeat();
      }

      await commitOffsetsIfNecessary();
    },
  });
}
