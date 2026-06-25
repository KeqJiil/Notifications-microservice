import { FastifyReply, FastifyRequest } from 'fastify';

export interface IMarkNotificationsReadService {
  handle(request: FastifyRequest, reply: FastifyReply): Promise<void>;
}
