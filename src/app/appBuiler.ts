import fastify from 'fastify';
import { env } from '@/common/secrets/env';
import fastifySSE from '@fastify/sse';

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
  app.register(fastifySSE);
  return app;
}
