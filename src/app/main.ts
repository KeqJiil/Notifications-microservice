import { appBuilder } from '@/app/appBuiler';
import { env } from '@/common/secrets/env';

async function start() {
  const app = await appBuilder();
  await app.listen({
    port: env.PORT,
  });
}

void start();
