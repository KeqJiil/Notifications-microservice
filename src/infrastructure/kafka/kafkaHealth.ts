import { Consumer } from 'kafkajs';

const consumers = new Map<string, Consumer>();
const consumerStatuses = new Map<string, boolean>();

export function trackConsumerHealth(name: string, consumer: Consumer): void {
  consumers.set(name, consumer);
  consumer.on(consumer.events.CONNECT, () => consumerStatuses.set(name, true));
  consumer.on(consumer.events.DISCONNECT, () =>
    consumerStatuses.set(name, false),
  );
  consumer.on(consumer.events.CRASH, () => consumerStatuses.set(name, false));
}

export async function disconnectAllKafkaConsumer() {
  await Promise.all(
    [...consumers.values()].map(
      async (consumer) => await consumer.disconnect(),
    ),
  );
}

export function isKafkaConsumersHealthy(): boolean {
  if (consumerStatuses.size === 0) return false;
  return [...consumerStatuses.values()].every(Boolean);
}
