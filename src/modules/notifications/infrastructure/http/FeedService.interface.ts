import { FastifyReply, FastifyRequest } from 'fastify';

export interface IFeedService {
  handle(request: FastifyRequest, reply: FastifyReply): Promise<void>;
}
