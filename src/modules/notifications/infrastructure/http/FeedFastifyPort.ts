import { FastifyReply, FastifyRequest } from 'fastify';
import { IFeedService } from '@modules/notifications/infrastructure/http/FeedService.interface';
import {
  IFeedCursor,
  IFeedRepository,
} from '@modules/notifications/application/abstractions/feed/FeedRepository.interface';
import { UserId } from '@modules/notifications/domain/TypedId/UserId';
import { BadRequestException } from '@/common/errors/HTTPData.Exceptions';

function decodeCursor(cursor: string): IFeedCursor {
  const [createdAtRaw, id] = Buffer.from(cursor, 'base64')
    .toString('utf8')
    .split('_');

  const createdAt = new Date(createdAtRaw);
  if (!id || Number.isNaN(createdAt.getTime())) {
    throw new BadRequestException();
  }

  return { createdAt, id };
}

function encodeCursor(cursor: IFeedCursor): string {
  return Buffer.from(`${cursor.createdAt.toISOString()}_${cursor.id}`).toString(
    'base64',
  );
}

export class FeedFastifyPort implements IFeedService {
  constructor(private readonly feedRepository: IFeedRepository) {}

  async handle(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const userId = new UserId(request.user.userId);
    const rawCursor = (request.query as { cursor?: string }).cursor;
    const cursor = rawCursor ? decodeCursor(rawCursor) : undefined;

    const { items, hasPreviousPage } = await this.feedRepository.getAll(
      userId,
      cursor,
    );

    const lastItem = items[items.length - 1];
    const nextCursor =
      hasPreviousPage && lastItem
        ? encodeCursor({ createdAt: lastItem.createdAt, id: lastItem.id })
        : null;

    reply.send({ items, hasPreviousPage, nextCursor });
  }
}
