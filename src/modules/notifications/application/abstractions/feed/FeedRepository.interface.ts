import { UserId } from '@modules/notifications/domain/TypedId/UserId';
import { IFeedRecord } from '@modules/notifications/application/abstractions/feed/FeedRecord.interface';

export interface IFeedCursor {
  createdAt: Date;
  id: string;
}

export interface IFeedPage {
  items: IFeedRecord[];
  hasPreviousPage: boolean;
}

export interface IFeedFilter {
  isRead?: boolean;
}

export interface IFeedRepository {
  insert(record: {
    idempotencyKey: string;
    userId: UserId;
    payload: unknown;
    createdAt: Date;
  }): Promise<void>;
  getAll(
    userId: string,
    cursor?: IFeedCursor,
    filter?: IFeedFilter,
  ): Promise<IFeedPage>;
  markAsRead(userId: UserId, ids: string[]): Promise<void>;
}
