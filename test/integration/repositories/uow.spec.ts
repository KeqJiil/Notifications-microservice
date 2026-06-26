import { Kysely } from 'kysely';
import { DB } from '@/infrastructure/database/types';
import {
  startTestPostgres,
  TestPostgres,
  truncateAll,
} from '../setup/postgres';
import { UoWRepository } from '@modules/notifications/infrastructure/repositories/UoW.repository';
import { KyselyTransactionContext } from '@modules/notifications/infrastructure/repositories/kyselyTransactionContext';
import { OutboxRepository } from '@modules/notifications/infrastructure/repositories/outbox/outbox.repository';
import { randomUUID } from 'node:crypto';

jest.setTimeout(60_000);

describe('UoWRepository (integration)', () => {
  let pg: TestPostgres;
  let db: Kysely<DB>;
  let ctx: KyselyTransactionContext;
  let uow: UoWRepository;
  let outbox: OutboxRepository;

  beforeAll(async () => {
    pg = await startTestPostgres();
    db = pg.db;
  });

  afterAll(async () => {
    await pg.teardown();
  });

  beforeEach(async () => {
    await truncateAll(db);

    ctx = new KyselyTransactionContext();
    uow = new UoWRepository(db, ctx);
    outbox = new OutboxRepository(db, ctx);
  });

  it('commits all writes when the action resolves', async () => {
    const eventId = randomUUID();
    await uow.run(async () => {
      await outbox.insert(eventId, {
        userId: randomUUID(),
        message: '12321321',
        channel: 'sms',
        type: 'billing_refund',
      });
    });

    const data = await db
      .selectFrom('outbox')
      .where('event_id', '=', eventId)
      .selectAll()
      .executeTakeFirst();
    expect(data).not.toBeUndefined();
  });

  it('rolls back ALL writes when the action throws partway through', async () => {
    const eventId = randomUUID();
    await uow
      .run(async () => {
        await outbox.insert(eventId, {
          userId: randomUUID(),
          message: '12321321',
          channel: 'sms',
          type: 'billing_refund',
        });
        throw new Error('boom');
      })
      .catch(() => {});

    const data = await db
      .selectFrom('outbox')
      .where('event_id', '=', eventId)
      .selectAll()
      .executeTakeFirst();
    expect(data).toBeUndefined();
  });

  it('repositories sharing the context see the same active transaction inside run()', async () => {
    const eventId = randomUUID();
    let visibleInsideTransaction: unknown;

    await uow.run(async () => {
      await outbox.insert(eventId, {
        userId: randomUUID(),
        message: '12321321',
        channel: 'sms',
        type: 'billing_refund',
      });

      const otherRepoOnSameCtx = new OutboxRepository(db, ctx);
      visibleInsideTransaction = await otherRepoOnSameCtx['tx']
        .selectFrom('outbox')
        .where('event_id', '=', eventId)
        .selectAll()
        .executeTakeFirst();
    });

    expect(visibleInsideTransaction).not.toBeUndefined();
  });

  it('outside of run(), repositories fall back to the base db connection', async () => {
    expect(ctx.getActiveTransaction()).toBeUndefined();

    const eventId = randomUUID();
    await outbox.insert(eventId, {
      userId: randomUUID(),
      message: '12321321',
      channel: 'sms',
      type: 'billing_refund',
    });

    const data = await db
      .selectFrom('outbox')
      .where('event_id', '=', eventId)
      .selectAll()
      .executeTakeFirst();
    expect(data).not.toBeUndefined();
  });
});
