import { Kafka } from 'kafkajs';
import { env } from '@/common/secrets/env';

let kafkaInstance: Kafka | null = null;

export function getKafka(): Kafka {
  if (!kafkaInstance) {
    kafkaInstance = new Kafka({
      clientId: env.KAFKA_CLIENT_ID ?? 'notification-service',
      brokers: env.KAFKA_BROKERS ?? '',
    });
  }
  return kafkaInstance;
}
