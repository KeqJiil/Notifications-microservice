import { appBuilder } from '@/app/appBuiler';
import { env } from '@/common/secrets/env';
import { FastifyInstance } from 'fastify';

async function start() {
  const app = await appBuilder();
  await app.listen({
    port: env.PORT,
    host: '0.0.0.0',
  });

  async function shutdown(app: FastifyInstance) {
    await app.close();
    process.exit(0);
  }
  process.on('SIGINT', () => void shutdown(app));
  process.on('SIGTERM', () => void shutdown(app));
}

void start();
