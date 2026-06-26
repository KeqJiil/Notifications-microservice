import { FastifyReply, FastifyRequest } from 'fastify';
import { IFeedService } from '@modules/notifications/infrastructure/http/FeedService.interface';
import { IFeedRepository } from '@modules/notifications/application/abstractions/feed/FeedRepository.interface';
import { BadRequestException } from '@/common/errors/HTTPData.Exceptions';
import { FeedCursor } from '@modules/notifications/infrastructure/http/schemas/feedCursor';
import { feedQuerySchema } from '@modules/notifications/infrastructure/http/schemas/feedQuery.schema';

export class FeedFastifyPort implements IFeedService {
  constructor(private readonly feedRepository: IFeedRepository) {}

  async handle(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const parsedQuery = feedQuerySchema.safeParse(request.query);
    if (!parsedQuery.success) {
      throw new BadRequestException();
    }

    const cursor = parsedQuery.data.cursor
      ? FeedCursor.decode(parsedQuery.data.cursor)
      : undefined;
    const isRead =
      parsedQuery.data.isRead === undefined
        ? undefined
        : parsedQuery.data.isRead === 'true';

    const { items, hasPreviousPage } = await this.feedRepository.getAll(
      request.user.userId,
      cursor,
      { isRead },
    );

    const lastItem = items[items.length - 1];
    const nextCursor =
      hasPreviousPage && lastItem
        ? FeedCursor.create(lastItem.createdAt, lastItem.id).encode()
        : null;

    reply.send({ items, hasPreviousPage, nextCursor });
  }
}
