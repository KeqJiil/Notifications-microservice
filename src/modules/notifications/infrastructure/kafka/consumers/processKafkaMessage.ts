import { KafkaMessage } from 'kafkajs';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import { EventDispatcher } from '@modules/notifications/infrastructure/kafka/dispatchers/event.dispatcher';
import { Event } from '@modules/notifications/application/abstractions/incomingQueueTypes';
import {
  eventEnvelopeSchema,
  getPayloadSchema,
} from '@modules/notifications/application/abstractions/incomingQueueTypes/event.schema';
import { logger } from '@/app/logger';
import { sendToDlqProducer } from '@modules/notifications/infrastructure/kafka/producer/dlq.producer';
import {
  KAFKA_CONSUMER_RETRY_DELAY_MS,
  KAFKA_INCOMING_DLQ_TOPIC,
  KAFKA_RATE_LIMIT_WAIT_TIME,
} from '@/common/consts/infrastucture.consts';
import { isNonRetryableError } from '@/common/errors/helpers/isNonRetryable';

export interface ProcessMessageResult {
  shouldCommit: boolean;
  shouldStopBatch: boolean;
}

export async function processKafkaMessage(
  message: KafkaMessage,
  topic: string,
  dispatcher: EventDispatcher,
  rateLimiter: RateLimiterMemory,
): Promise<ProcessMessageResult> {
  if (message.value === null) {
    return { shouldCommit: true, shouldStopBatch: false };
  }

  try {
    await rateLimiter.consume(topic);
  } catch {
    await new Promise((resolve) =>
      setTimeout(resolve, KAFKA_RATE_LIMIT_WAIT_TIME),
    );
    return { shouldCommit: false, shouldStopBatch: true };
  }

  try {
    const raw = JSON.parse(message.value.toString());
    const envelope = eventEnvelopeSchema.parse(raw);
    const payload = getPayloadSchema(envelope.type).parse(envelope.payload);
    const event = { ...envelope, payload } as Event;
    await dispatcher.process(event.type, event);
    return { shouldCommit: true, shouldStopBatch: false };
  } catch (err) {
    if (isNonRetryableError(err)) {
      logger.error(
        `[Kafka] Non-retryable, sending to DLQ. Topic "${topic}" offset ${message.offset}:`,
      );
      await sendToDlqProducer([message], KAFKA_INCOMING_DLQ_TOPIC);
      return { shouldCommit: true, shouldStopBatch: false };
    }

    logger.error(
      `[Kafka] Retryable failure, will redeliver. Topic "${topic}" offset ${message.offset}:`,
    );
    await new Promise((resolve) =>
      setTimeout(resolve, KAFKA_CONSUMER_RETRY_DELAY_MS),
    );
    return { shouldCommit: false, shouldStopBatch: true };
  }
}
