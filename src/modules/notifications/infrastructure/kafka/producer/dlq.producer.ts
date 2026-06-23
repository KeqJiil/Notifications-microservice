import { kafka } from '@/infrastructure/kafka/kafka';
import { Message, Producer } from 'kafkajs';
import { KAFKA_DLQ_TOPIC } from '@/common/consts/infrastucture.consts';
import { logger } from '@/app/logger';

let dlqProducer: Producer | null = null;

export async function startKafkaDlqProducer() {
  dlqProducer = kafka.producer({
    idempotent: true,
    maxInFlightRequests: 3,
    retry: {
      retries: 5,
      initialRetryTime: 300,
      maxRetryTime: 10_000,
    },
  });

  await dlqProducer.connect();
}

export async function sendToDlqProducer(messages: Message[]) {
  if (!dlqProducer) throw new Error('Producer not found');

  try {
    await dlqProducer.send({
      topic: KAFKA_DLQ_TOPIC,
      messages,
      acks: -1,
    });
  } catch (e) {
    logger.error(e);
    throw e;
  }
}

export async function gracefulShutdownDlqProducer() {
  if (dlqProducer) {
    await dlqProducer.disconnect();
    logger.info('DLQ Kafka producer disconnected');
    dlqProducer = null;
  }
}
