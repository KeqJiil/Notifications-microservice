import { IFeedCursor } from '@modules/notifications/application/abstractions/feed/FeedRepository.interface';
import { BadRequestException } from '@/common/errors/HTTPData.Exceptions';

export function decodeCursor(cursor: string): IFeedCursor {
  const [createdAtRaw, id] = Buffer.from(cursor, 'base64')
    .toString('utf8')
    .split('_');

  const createdAt = new Date(createdAtRaw);
  if (!id || Number.isNaN(createdAt.getTime())) {
    throw new BadRequestException();
  }

  return { createdAt, id };
}

export function encodeCursor(cursor: IFeedCursor): string {
  return Buffer.from(`${cursor.createdAt.toISOString()}_${cursor.id}`).toString(
    'base64',
  );
}
