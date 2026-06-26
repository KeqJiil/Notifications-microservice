import { KafkaContainer } from '@testcontainers/kafka';
import { Kafka, logLevel } from 'kafkajs';
import { Wait } from 'testcontainers'; // ← важно!

export async function startTestKafka() {
  const container = await new KafkaContainer('confluentinc/cp-kafka:7.6.0')
    .withKraft()
    .withStartupTimeout(90_000)
    .withWaitStrategy(
      Wait.forLogMessage(
        /Kafka Server started|started \(kafka.server.KafkaServer\)/,
        1,
      ),
    )
    .start();

  const brokerUrl = `${container.getHost()}:${container.getMappedPort(9093)}`;

  const brokers = [brokerUrl];

  const kafka = new Kafka({
    clientId: 'test-client',
    brokers,
    connectionTimeout: 30000,
    retry: {
      initialRetryTime: 500,
      retries: 10,
      maxRetryTime: 60000,
    },
    logLevel: logLevel.ERROR,
  });

  const teardown = async () => {
    await container.stop();
  };

  return { container, kafka, brokers: brokers.join(','), teardown };
}
