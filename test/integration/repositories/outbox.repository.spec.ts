import { Kysely } from 'kysely';
import { DB } from '@/infrastructure/database/types';
import { OutboxRepository } from '@modules/notifications/infrastructure/repositories/outbox/outbox.repository';
import { KyselyTransactionContext } from '@modules/notifications/infrastructure/repositories/kyselyTransactionContext';
import {
  startTestPostgres,
  TestPostgres,
  truncateAll,
} from '../setup/postgres';
import { randomUUID } from 'node:crypto';

jest.setTimeout(60_000);

describe('OutboxRepository (integration)', () => {
  let pg: TestPostgres;
  let db: Kysely<DB>;
  let repo: OutboxRepository;

  beforeAll(async () => {
    pg = await startTestPostgres();
    db = pg.db;
    repo = new OutboxRepository(db, new KyselyTransactionContext());
  });

  afterAll(async () => {
    await pg.teardown();
  });

  beforeEach(async () => {
    await truncateAll(db);
  });

  it('insert with a duplicate event_id does not create a second row', async () => {
    await repo.insert('evt-1', { type: 'password_changed' } as never);
    await repo.insert('evt-1', { type: 'password_changed' } as never);

    const rows = await db.selectFrom('outbox').selectAll().execute();
    expect(rows).toHaveLength(1);
  });

  it('claimBatch returns PENDING rows whose next_attempt_at is in the past', async () => {
    const uuid = randomUUID();
    await repo.insert(uuid, { type: 'password_changed' } as never);

    const batch = await repo.claimBatch(10);

    expect(batch).toHaveLength(1);
    expect(batch[0].eventId).toBe(uuid);
  });

  it('claimBatch skips rows whose next_attempt_at is in the future', async () => {
    const uuid = randomUUID();
    await repo.insert(uuid, { type: 'password_changed' } as never);
    await db
      .updateTable('outbox')
      .set({ next_attempt_at: new Date(Date.now() + 60_000) })
      .where('event_id', '=', uuid)
      .execute();

    const batch = await repo.claimBatch(10);

    expect(batch).toHaveLength(0);
  });

  it('markSucceed sets status=SUCCESS', async () => {
    const uuid = randomUUID();
    await repo.insert(uuid, { type: 'password_changed' } as never);
    const batch = await repo.claimBatch(1);
    await repo.markSucceed(batch[0].id);
    const data = await pg.db
      .selectFrom('outbox')
      .where('event_id', '=', uuid)
      .selectAll()
      .executeTakeFirst();
    expect(data).not.toBeUndefined();
    expect(data!.status).toBe('SUCCESS');
  });

  it('markDead sets status=DEAD', async () => {
    const uuid = randomUUID();
    await repo.insert(uuid, { type: 'password_changed' } as never);
    const batch = await repo.claimBatch(1);
    await repo.markDead(batch[0].id);
    const data = await pg.db
      .selectFrom('outbox')
      .where('event_id', '=', uuid)
      .selectAll()
      .executeTakeFirst();
    expect(data).not.toBeUndefined();
    expect(data!.status).toBe('DEAD');
  });

  it('retry increments retries and pushes next_attempt_at forward', async () => {
    const uuid = randomUUID();
    await repo.insert(uuid, { type: 'password_changed' } as never);
    const data = await pg.db
      .selectFrom('outbox')
      .where('event_id', '=', uuid)
      .selectAll()
      .executeTakeFirst();
    await repo.retry(data!.id, new Date(Date.now() + 60_000));
    const newData = await pg.db
      .selectFrom('outbox')
      .where('event_id', '=', uuid)
      .selectAll()
      .executeTakeFirst();
    expect(data!.next_attempt_at).not.toBe(newData!.next_attempt_at);
    expect(data!.retries).not.toBe(newData!.retries);
  });
});
