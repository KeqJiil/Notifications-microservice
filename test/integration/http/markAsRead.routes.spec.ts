import { FastifyInstance } from 'fastify';
import { appBuilder } from '@/app/appBuiler';
import { db } from '@/infrastructure/database/database';
import { randomUUID } from 'node:crypto';
import { MARK_AS_READ_MAX_IDS } from '@/common/consts/feedConsts';

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

// feed.routes.spec.ts runs in a different jest worker against this same shared
// dev Postgres (it's not Testcontainers-isolated). A blanket
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
  const notificationId = randomUUID();
  await db
    .insertInto('notifications')
    .values({
      id: notificationId,
      idempotency_key: `${userId}:${idempotency_key}`,
      user_id: userId,
      payload: JSON.stringify({ type: 'test' }),
      is_read: overrides.isRead ?? false,
    })
    .execute();
  return notificationId;
}

async function getNotifications(id: string) {
  return await db
    .selectFrom('notifications')
    .where('id', '=', id)
    .selectAll()
    .execute();
}

describe('PATCH /notifications/read (integration)', () => {
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

  it('400 when ids is an empty array (.min(1))', async () => {
    const ids = [];
    const res = await app.inject({
      method: 'PATCH',
      url: '/notifications/read',
      body: { ids },
      headers: {
        'x-user-id': 'user-1',
        'x-user-role': 'USER',
      },
    });

    expect(res.statusCode).toBe(400);
  });

  it('400 when ids has more than MARK_AS_READ_MAX_IDS entries (.max)', async () => {
    const ids = Array.from({ length: MARK_AS_READ_MAX_IDS + 1 }, () =>
      randomUUID(),
    );
    const res = await app.inject({
      method: 'PATCH',
      url: '/notifications/read',
      body: { ids },
      headers: {
        'x-user-id': 'user-1',
        'x-user-role': 'USER',
      },
    });

    expect(res.statusCode).toBe(400);
  });

  it('400 when any id is not a uuid', async () => {
    const ids = Array.from({ length: MARK_AS_READ_MAX_IDS - 1 }, (_, id) =>
      String(id + 1),
    );

    const res = await app.inject({
      method: 'PATCH',
      url: '/notifications/read',
      body: { ids },
      headers: {
        'x-user-id': 'user-1',
        'x-user-role': 'USER',
      },
    });

    expect(res.statusCode).toBe(400);
  });

  it("204 and flips is_read for the caller's own notifications", async () => {
    const userId = await seedUser();
    const notificationsId = await seedNotification(userId);

    const res = await app.inject({
      method: 'PATCH',
      url: '/notifications/read',
      headers: {
        'x-user-id': userId,
        'x-user-role': 'USER',
      },
      body: { ids: [notificationsId] },
    });

    const notification = await getNotifications(notificationsId);

    expect(res.statusCode).toBe(204);
    expect(notification[0].is_read).toBe(true);
  });

  it('does not modify notifications owned by a different user', async () => {
    const userId = await seedUser();
    const otherUserId = await seedUser({ userId: randomUUID() });
    const notificationsId = await seedNotification(userId);

    const res = await app.inject({
      method: 'PATCH',
      url: '/notifications/read',
      body: { ids: [notificationsId] },
      headers: {
        'x-user-id': otherUserId,
        'x-user-role': 'USER',
      },
    });

    const notification = await getNotifications(notificationsId);

    expect(res.statusCode).toBe(204);
    expect(notification[0].is_read).toBe(false);
  });
});
