import fastify from 'fastify';
import { env } from '@/common/secrets/env';
import fastifySSE from '@fastify/sse';
import fastifyUnderPressure from '@fastify/under-pressure';

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

  app.register(fastifyUnderPressure, {
    maxEventLoopDelay: 1000,
    maxHeapUsedBytes: 1_000_000_000,
    maxRssBytes: 1_000_000_000,
    exposeStatusRoute: {
      routeOpts: {},
      url: '/health/live',
    },
  });

  return app;
}
