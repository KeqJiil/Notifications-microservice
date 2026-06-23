import { FastifyInstance } from 'fastify';
import { sql } from 'kysely';
import { db } from '@/infrastructure/database/database';
import { pub, sub } from '@/infrastructure/redis/redis';
import { isKafkaConsumersHealthy } from '@/infrastructure/kafka/kafkaHealth';
import { isDlqProducerConnected } from '@modules/notifications/infrastructure/kafka/producer/dlq.producer';

export function registerHealthchecks(app: FastifyInstance): void {
  app.get('/health/ready', async (_request, reply) => {
    const [dbCheck, pubCheck, subCheck] = await Promise.allSettled([
      sql`SELECT 1`.execute(db),
      pub.ping(),
      sub.ping(),
    ]);

    const checks = {
      db: dbCheck.status === 'fulfilled',
      redis: pubCheck.status === 'fulfilled' && subCheck.status === 'fulfilled',
      kafka: isKafkaConsumersHealthy() && isDlqProducerConnected(),
    };

    const ready = Object.values(checks).every(Boolean);

    reply.code(ready ? 200 : 503).send({
      status: ready ? 'ok' : 'unavailable',
      checks,
    });
  });
}
