import { FastifyReply, FastifyRequest } from 'fastify';

export interface ISSEService {
  handle(request: FastifyRequest, reply: FastifyReply): Promise<void>;
}
