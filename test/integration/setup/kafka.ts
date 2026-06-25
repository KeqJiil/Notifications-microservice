import { KafkaContainer, StartedKafkaContainer } from '@testcontainers/kafka';
import { Kafka } from 'kafkajs';

export interface TestKafka {
  container: StartedKafkaContainer;
  kafka: Kafka;
  broker: string;
  teardown: () => Promise<void>;
}

export async function startTestKafka(): Promise<TestKafka> {
  const container = await new KafkaContainer(
    'confluentinc/cp-kafka:7.6.0',
  ).start();

  const broker = `${container.getHost()}:${container.getMappedPort(9093)}`;

  const kafka = new Kafka({
    clientId: 'notifications-test',
    brokers: [broker],
  });

  const teardown = async () => {
    await container.stop();
  };

  return { container, kafka, broker, teardown };
}
