import { FeedCursor } from '@modules/notifications/infrastructure/http/schemas/feedCursor';
import { BadRequestException } from '@/common/errors/HTTPData.Exceptions';

describe('FeedCursor', () => {
  it('encode -> decode round-trips createdAt and id', () => {
    const cursor = FeedCursor.create(new Date(5738495729853), 'fjhad');

    const decoded = FeedCursor.decode(cursor.encode());

    expect(decoded).toEqual(cursor);
  });

  it('decode throws BadRequestException on non-base64 garbage', () => {
    expect(() => FeedCursor.decode('1')).toThrow(BadRequestException);
  });

  it('decode throws BadRequestException when the id segment is missing', () => {
    const malformed = Buffer.from(
      new Date(5738495729853).toISOString(),
    ).toString('base64');

    expect(() => FeedCursor.decode(malformed)).toThrow(BadRequestException);
  });

  it('decode throws BadRequestException when the date segment is invalid', () => {
    const malformed = Buffer.from('not-a-date_fjhad').toString('base64');

    expect(() => FeedCursor.decode(malformed)).toThrow(BadRequestException);
  });
});
