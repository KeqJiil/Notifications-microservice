import { appBuilder } from '@/app/appBuiler';
import { FastifyInstance } from 'fastify';
import { db } from '@/infrastructure/database/database';
import { randomUUID } from 'node:crypto';

jest.mock('@/infrastructure/redis/redis');
jest.mock('@/infrastructure/kafka/kafka', () => {
  const producer = {
    connect: jest.fn(),
    disconnect: jest.fn(),
    send: jest.fn(),
  };
  const consumer = {
    connect: jest.fn(),
    disconnect: jest.fn(),
    subscribe: jest.fn(),
    run: jest.fn(),
    seek: jest.fn(),
    on: jest.fn(),
    events: {
      CONNECT: 'consumer.connect',
      DISCONNECT: 'consumer.disconnect',
      CRASH: 'consumer.crash',
      GROUP_JOIN: 'consumer.group_join',
    },
  };
  return {
    getKafka: jest.fn(() => ({
      producer: jest.fn(() => producer),
      consumer: jest.fn(() => consumer),
    })),
    resetKafka: jest.fn(),
  };
});

// markAsRead.routes.spec.ts runs in a different jest worker against this same
// shared dev Postgres (it's not Testcontainers-isolated). A blanket
// `deleteFrom('notifications')` in afterEach would wipe rows the other file's
// concurrently-running test just inserted -> FK violations. Track and delete
// only what THIS file created.
const seededUserIds: string[] = [];

async function seedUser(
  overrides: Partial<{ userId: string; email: string }> = {},
) {
  const userId = overrides.userId ?? randomUUID();
  await db
    .insertInto('user_notifications')
    .values({
      user_id: userId,
      email: overrides.email ?? `${userId}@test.local`,
    })
    .execute();
  seededUserIds.push(userId);
  return userId;
}

async function seedNotification(
  userId: string,
  idempotency_key: string = randomUUID(),
  overrides: Partial<{ isRead: boolean }> = {},
) {
  await db
    .insertInto('notifications')
    .values({
      user_id: userId,
      payload: JSON.stringify({ type: 'test' }),
      is_read: overrides.isRead ?? false,
      idempotency_key: `${userId}:${idempotency_key}`,
    })
    .execute();
}

describe('GET /notifications/feed (integration)', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await appBuilder();
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(async () => {
    if (seededUserIds.length === 0) return;
    // notifications.user_id has ON DELETE CASCADE, so deleting the seeded users
    // also removes their notifications without touching other workers' rows.
    await db
      .deleteFrom('user_notifications')
      .where('user_id', 'in', seededUserIds)
      .execute();
    seededUserIds.length = 0;
  });

  it('401 when x-user-id / x-user-role headers are missing', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/notifications/feed',
    });

    expect(res.statusCode).toBe(401);
  });

  it('400 when ?isRead is not "true" | "false"', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/notifications/feed',
      headers: {
        'x-user-id': 'user-1',
        'x-user-role': 'USER',
      },
      query: {
        isRead: '12312312',
      },
    });

    expect(res.statusCode).toBe(400);
  });

  it('400 when ?cursor is malformed', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/notifications/feed',
      headers: {
        'x-user-id': 'user-1',
        'x-user-role': 'USER',
      },
      query: {
        cursor: '12312321',
      },
    });

    expect(res.statusCode).toBe(400);
  });

  it('200 with items + nextCursor for a valid request', async () => {
    const userId = await seedUser();
    await seedNotification(userId);
    const res = await app.inject({
      method: 'GET',
      url: '/notifications/feed',
      headers: {
        'x-user-id': userId,
        'x-user-role': 'USER',
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().items).toHaveLength(1);
  });

  it("returns only the calling user's notifications", async () => {
    const userId = await seedUser();
    const otherUserId = await seedUser();
    await seedNotification(userId);
    await seedNotification(otherUserId);
    const res = await app.inject({
      method: 'GET',
      url: '/notifications/feed',
      headers: {
        'x-user-id': userId,
        'x-user-role': 'USER',
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().items.length).toBe(1);
    expect(res.json().items[0].userId).toBe(userId);
  });

  it('429 once the per-user rate limit is exceeded', async () => {
    const userId = await seedUser();
    for (let i = 0; i < 101; i++) {
      await app.inject({
        method: 'GET',
        url: '/notifications/feed',
        headers: {
          'x-user-id': userId,
          'x-user-role': 'USER',
        },
      });
    }
    const res = await app.inject({
      method: 'GET',
      url: '/notifications/feed',
      headers: {
        'x-user-id': userId,
        'x-user-role': 'USER',
      },
    });
    expect(res.statusCode).toBe(429);
  });
});
