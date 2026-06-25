import { httpRateLimiter } from '@modules/notifications/infrastructure/http/httpRateLimiter';
import { FastifyInstance } from 'fastify';

export function registerPreHandlers(app: FastifyInstance) {
  app.addHook('preHandler', async (request, reply) => {
    const userId = request.headers['x-user-id'];
    const role = request.headers['x-user-role'];
    if (!userId || !role) {
      reply.status(401).send({ message: 'Unauthorized' });
      return;
    }
    request.user = {
      userId: userId as string,
      role: role as string,
    };
  });

  app.addHook('preHandler', async (request, reply) => {
    try {
      await httpRateLimiter.consume(request.user.userId);
    } catch {
      reply.status(429).send({ message: 'Too Many Requests' });
    }
  });
}
