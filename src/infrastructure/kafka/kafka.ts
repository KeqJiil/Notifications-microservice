import { Kafka } from 'kafkajs';
import { env } from '@/common/secrets/env';

export const kafka = new Kafka({
  clientId: env.KAFKA_CLIENT_ID,
  brokers: env.KAFKA_BROKERS,
});

export const producer = kafka.producer({ idempotent: true });
