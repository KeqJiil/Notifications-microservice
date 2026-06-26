import { Kafka } from 'kafkajs';
import { env } from '@/common/secrets/env';

let kafkaInstance: Kafka | null = null;

export function getKafka(): Kafka {
  if (!kafkaInstance) {
    const brokers = (process.env.KAFKA_BROKERS ?? '')
      .split(',')
      .map((b) => b.trim())
      .filter(Boolean);

    kafkaInstance = new Kafka({
      clientId: env.KAFKA_CLIENT_ID ?? 'notification-service',
      brokers,
    });
  }
  return kafkaInstance;
}

export function resetKafka(): void {
  kafkaInstance = null;
}
