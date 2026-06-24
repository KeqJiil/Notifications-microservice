import { appBuilder } from '@/app/appBuiler';
import { env } from '@/common/secrets/env';
import { registerHealthchecks } from '@modules/healthchecks/healthchecks.module';
import { buildNotificationsModule } from '@modules/notifications/module/notification.module';
import { FastifyInstance } from 'fastify';

async function start() {
  const app = await appBuilder();
  registerHealthchecks(app);
  await buildNotificationsModule(app);
  await app.listen({
    port: env.PORT,
  });

  async function shutdown(app: FastifyInstance) {
    await app.close();
    process.exit(0);
  }
  process.on('SIGINT', () => void shutdown(app));
  process.on('SIGTERM', () => void shutdown(app));
}

void start();
