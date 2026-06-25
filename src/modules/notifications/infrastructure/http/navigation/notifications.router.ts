import { FastifyInstance } from 'fastify';
import { SSEFastifyPort } from '@modules/notifications/infrastructure/http/SSEFastifyPort';
import { FeedFastifyPort } from '@modules/notifications/infrastructure/http/FeedFastifyPort';
import { MarkNotificationsReadFastifyPort } from '@modules/notifications/infrastructure/http/MarkNotificationsReadFastifyPort';

export function registerNotificationRoutes(
  app: FastifyInstance,
  httpSSE: SSEFastifyPort,
  feedHttp: FeedFastifyPort,
  markNotificationsReadHttp: MarkNotificationsReadFastifyPort,
) {
  app.get(`/notifications`, httpSSE.handle.bind(httpSSE));
  app.get(`/notifications/feed`, feedHttp.handle.bind(feedHttp));
  app.patch(
    `/notifications/read`,
    markNotificationsReadHttp.handle.bind(markNotificationsReadHttp),
  );
}
