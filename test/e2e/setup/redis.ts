import { RedisContainer, StartedRedisContainer } from '@testcontainers/redis';
import Redis from 'ioredis';

export interface TestRedis {
  container: StartedRedisContainer;
  createClient: () => Redis;
  teardown: () => Promise<void>;
}

export async function startTestRedis(): Promise<TestRedis> {
  const container = await new RedisContainer('redis:8').start();

  const clients: Redis[] = [];
  const createClient = (): Redis => {
    const client = new Redis(container.getPort(), container.getHost());
    clients.push(client);
    return client;
  };

  const teardown = async () => {
    await Promise.all(clients.map((c) => c.quit().catch(() => c.disconnect())));
    await container.stop();
  };

  return { container, createClient, teardown };
}
