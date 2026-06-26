import {
  startTestPostgres,
  TestPostgres,
  truncateAll,
} from '../setup/postgres';
import { Kysely } from 'kysely';
import { DB } from '@/infrastructure/database/types';
import { KyselyTransactionContext } from '@modules/notifications/infrastructure/repositories/kyselyTransactionContext';
import { randomUUID } from 'node:crypto';
import { FeedRepository } from '@modules/notifications/infrastructure/repositories/feed.repository';
import { UserId } from '@modules/notifications/domain/TypedId/UserId';
import { FEED_PAGE_SIZE } from '@/common/consts/feedConsts';

jest.setTimeout(60_000);

describe('FeedRepository (integration)', () => {
  let pg: TestPostgres;
  let db: Kysely<DB>;
  let repo: FeedRepository;

  beforeAll(async () => {
    pg = await startTestPostgres();
    db = pg.db;
    repo = new FeedRepository(db, new KyselyTransactionContext());
  });

  afterAll(async () => {
    await pg.teardown();
  });

  beforeEach(async () => {
    await truncateAll(db);
  });

  async function seedUser(): Promise<UserId> {
    const userId = new UserId(randomUUID());
    await db
      .insertInto('user_notifications')
      .values({
        user_id: userId.toString(),
        email: `${userId.toString()}@test.local`,
      })
      .execute();
    return userId;
  }

  it('insert with duplicate idempotency_key does not create a second row', async () => {
    const userId = await seedUser();
    const idempotency = randomUUID();
    await repo.insert({
      idempotencyKey: idempotency,
      userId,
      payload: {},
      createdAt: new Date(),
    });

    await repo.insert({
      idempotencyKey: idempotency,
      userId,
      payload: {},
      createdAt: new Date(),
    });

    const data = await db
      .selectFrom('notifications')
      .where('user_id', '=', userId.toString())
      .selectAll()
      .execute();

    expect(data.length).toBe(1);
  });

  it('getAll returns only rows for the given userId', async () => {
    const user1 = await seedUser();
    const user2 = await seedUser();
    await repo.insert({
      idempotencyKey: '1312312321321321321',
      userId: user1,
      payload: {},
      createdAt: new Date(),
    });
    await repo.insert({
      idempotencyKey: '131231232132131312321321',
      userId: user2,
      payload: {},
      createdAt: new Date(),
    });

    const data = await repo.getAll(user1.toString());

    expect(data.items.length).toBe(1);
  });

  it('getAll with filter.isRead=true returns only read rows', async () => {
    const userId = await seedUser();
    const firstIdempotency = randomUUID();
    const secondIdempotency = randomUUID();
    await repo.insert({
      idempotencyKey: firstIdempotency,
      userId,
      payload: {},
      createdAt: new Date(),
    });

    await repo.insert({
      idempotencyKey: secondIdempotency,
      userId,
      payload: {},
      createdAt: new Date(),
    });

    const feed = await repo.getAll(userId.toString());

    await repo.markAsRead(userId, [feed.items[0].id]);

    const newFeed = await repo.getAll(userId.toString(), undefined, {
      isRead: false,
    });

    expect(newFeed.items.length).toBe(1);
  });

  it('cursor pagination across >FEED_PAGE_SIZE rows has no gaps or duplicates at the page seam', async () => {
    const userId = await seedUser();
    const total = FEED_PAGE_SIZE + 5;
    for (let i = 0; i < total; i++) {
      await repo.insert({
        idempotencyKey: `seam-${i}`,
        userId,
        payload: {},
        createdAt: new Date(),
      });
    }

    const firstPage = await repo.getAll(userId.toString());
    expect(firstPage.items.length).toBe(FEED_PAGE_SIZE);
    expect(firstPage.hasPreviousPage).toBe(true);

    const lastItem = firstPage.items[firstPage.items.length - 1];
    const secondPage = await repo.getAll(userId.toString(), {
      createdAt: lastItem.createdAt,
      id: lastItem.id,
    });

    expect(secondPage.items.length).toBe(total - FEED_PAGE_SIZE);
    expect(secondPage.hasPreviousPage).toBe(false);

    const firstPageIds = firstPage.items.map((i) => i.id);
    const secondPageIds = secondPage.items.map((i) => i.id);
    const overlap = firstPageIds.filter((id) => secondPageIds.includes(id));
    expect(overlap.length).toBe(0);

    const allIds = new Set([...firstPageIds, ...secondPageIds]);
    expect(allIds.size).toBe(total);
  });

  it('markAsRead flips is_read=true only for the given ids', async () => {
    const userId = await seedUser();
    const firstIdempotency = randomUUID();
    const secondIdempotency = randomUUID();
    await repo.insert({
      idempotencyKey: firstIdempotency,
      userId,
      payload: {},
      createdAt: new Date(),
    });

    await repo.insert({
      idempotencyKey: secondIdempotency,
      userId,
      payload: {},
      createdAt: new Date(),
    });

    const feed = await repo.getAll(userId.toString());

    await repo.markAsRead(userId, [feed.items[0].id]);

    const newFeed = await repo.getAll(userId.toString(), undefined, {
      isRead: true,
    });

    expect(feed.items[0].id).toBe(newFeed.items[0].id);
    expect(feed.items[0].isRead).toBe(false);
    expect(newFeed.items[0].isRead).toBe(true);
  });

  it('markAsRead does NOT touch rows belonging to a different userId', async () => {
    const userId = await seedUser();
    const otherUserId = await seedUser();
    await repo.insert({
      idempotencyKey: randomUUID(),
      userId,
      payload: {},
      createdAt: new Date(),
    });
    await repo.insert({
      idempotencyKey: randomUUID(),
      userId: otherUserId,
      payload: {},
      createdAt: new Date(),
    });

    const otherFeedBefore = await repo.getAll(otherUserId.toString());
    await repo.markAsRead(userId, [otherFeedBefore.items[0].id]);

    const otherFeedAfter = await repo.getAll(otherUserId.toString());
    expect(otherFeedAfter.items[0].isRead).toBe(false);
  });

  it('markAsRead with an empty id array is a no-op', async () => {
    const userId = await seedUser();
    await repo.insert({
      idempotencyKey: '1312312321321321321',
      userId,
      payload: {},
      createdAt: new Date(),
    });

    const feed = await repo.getAll(userId.toString());

    await repo.markAsRead(userId, []);

    const feedAfter = await repo.getAll(userId.toString());

    expect(feedAfter.items[0].isRead).toBe(feed.items[0].isRead);
    expect(feedAfter.items[0].isRead).toBe(false);
  });
});
