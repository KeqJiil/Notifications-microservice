import { appBuilder } from '@/app/appBuiler';
import { env } from '@/common/secrets/env';
import { registerHealthchecks } from '@modules/healthchecks/healthchecks.module';

async function start() {
  const app = await appBuilder();
  registerHealthchecks(app);
  await app.listen({
    port: env.PORT,
  });
}

void start();
