import fastify from 'fastify';
import { env } from '@/common/secrets/env';

export function appBuilder() {
  const app = fastify({
    logger: {
      level: 'info',
      transport:
        env.NODE_ENV === 'production' ? undefined : { target: 'pino-pretty' },
      redact: ['req.headers.authorization', 'req.headers.cookie'],
    },
    disableRequestLogging: false,
  });
  return app;
}
