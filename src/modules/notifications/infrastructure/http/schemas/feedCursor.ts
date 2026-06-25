import { BadRequestException } from '@/common/errors/HTTPData.Exceptions';

export class FeedCursor {
  private constructor(
    public readonly createdAt: Date,
    public readonly id: string,
  ) {}

  static create(createdAt: Date, id: string): FeedCursor {
    return new FeedCursor(createdAt, id);
  }

  static decode(raw: string): FeedCursor {
    const [createdAtRaw, id] = Buffer.from(raw, 'base64')
      .toString('utf8')
      .split('_');

    const createdAt = new Date(createdAtRaw);
    if (!id || Number.isNaN(createdAt.getTime())) {
      throw new BadRequestException();
    }

    return new FeedCursor(createdAt, id);
  }

  encode(): string {
    return Buffer.from(`${this.createdAt.toISOString()}_${this.id}`).toString(
      'base64',
    );
  }
}
