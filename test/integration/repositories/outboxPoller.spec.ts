import { randomUUID } from 'node:crypto';
import { Kysely } from 'kysely';
import { DB, OutboxStatus } from '@/infrastructure/database/types';
import {
  startTestPostgres,
  TestPostgres,
  truncateAll,
} from '../setup/postgres';
import { OutboxRepository } from '@modules/notifications/infrastructure/repositories/outbox/outbox.repository';
import { OutboxPoller } from '@modules/notifications/infrastructure/repositories/outbox/OutboxPoller';
import { KyselyTransactionContext } from '@modules/notifications/infrastructure/repositories/kyselyTransactionContext';
import { UseCaseDispatcher } from '@modules/notifications/application/services/useCase.dispatcher';
import { sendToDlqProducer } from '@modules/notifications/infrastructure/kafka/producer/dlq.producer';
import { NonRetryableException } from '@/common/errors/NonRetryable.exception';
import { OUTBOX_MAX_RETRIES } from '@/common/consts/outboxConsts';

jest.mock('@modules/notifications/infrastructure/kafka/producer/dlq.producer');

jest.setTimeout(60_000);

async function waitFor(
  assertion: () => Promise<void>,
  timeoutMs = 8_000,
  intervalMs = 25,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    try {
      await assertion();
      return;
    } catch (err) {
      if (Date.now() > deadline) throw err;
      await new Promise((r) => setTimeout(r, intervalMs));
    }
  }
}

describe('OutboxPoller (integration)', () => {
  let pg: TestPostgres;
  let db: Kysely<DB>;
  let repo: OutboxRepository;
  let dispatcher: UseCaseDispatcher;
  let dispatcherHandleMock: jest.SpyInstance;
  let poller: OutboxPoller;

  beforeAll(async () => {
    pg = await startTestPostgres();
    db = pg.db;
  });

  afterAll(async () => {
    await pg.teardown();
  });

  beforeEach(async () => {
    await truncateAll(db);

    repo = new OutboxRepository(db, new KyselyTransactionContext());
    dispatcher = new UseCaseDispatcher();
    dispatcherHandleMock = jest.spyOn(dispatcher, 'handle');
    poller = new OutboxPoller(dispatcher, repo);

    (sendToDlqProducer as jest.Mock).mockReset().mockResolvedValue(undefined);
  });

  afterEach(async () => {
    await poller.stop();
  });

  async function insertOutbox(opts: {
    retries?: number;
    type?: string;
  }): Promise<string> {
    const payload = {
      userId: randomUUID(),
      channel: ['inapp'],
      type: opts.type ?? 'property_created',
      message: 'test message',
    };

    const row = await db
      .insertInto('outbox')
      .values({
        event_id: randomUUID(),
        payload: JSON.stringify(payload),
        status: 'PENDING',
        retries: opts.retries ?? 0,
        next_attempt_at: new Date(Date.now() - 1_000),
      })
      .returning('id')
      .executeTakeFirstOrThrow();

    return row.id;
  }

  function getRow(id: string) {
    return db
      .selectFrom('outbox')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();
  }

  function runOnePollCycle() {
    poller.start(60_000);
  }

  async function expectStatus(id: string, status: OutboxStatus) {
    await waitFor(async () => {
      const row = await getRow(id);
      expect(row?.status).toBe(status);
    });
  }

  it('row at OUTBOX_MAX_RETRIES goes straight to DLQ, dispatcher not called', async () => {
    const id = await insertOutbox({ retries: OUTBOX_MAX_RETRIES });

    runOnePollCycle();

    await expectStatus(id, 'DEAD');
    expect(dispatcherHandleMock).not.toHaveBeenCalled();
    expect(sendToDlqProducer).toHaveBeenCalledTimes(1);
  });

  it('dispatcher success -> row marked SUCCESS', async () => {
    const id = await insertOutbox({ retries: 0 });

    runOnePollCycle();

    await expectStatus(id, 'SUCCESS');
    expect(dispatcherHandleMock).toHaveBeenCalledTimes(1);
    expect(dispatcherHandleMock).toHaveBeenCalledWith(
      'property_created',
      expect.objectContaining({ id }),
    );
    expect(sendToDlqProducer).not.toHaveBeenCalled();
  });

  it('dispatcher throws NonRetryableException -> row marked DEAD + sent to DLQ', async () => {
    dispatcherHandleMock.mockRejectedValue(
      new NonRetryableException('cannot process'),
    );
    const id = await insertOutbox({ retries: 0 });

    runOnePollCycle();

    await expectStatus(id, 'DEAD');
    expect(sendToDlqProducer).toHaveBeenCalledTimes(1);
  });

  it('dispatcher throws generic Error -> retries incremented, next_attempt_at in the future', async () => {
    dispatcherHandleMock.mockRejectedValue(new Error('transient'));
    const id = await insertOutbox({ retries: 1 });

    const before = Date.now();
    runOnePollCycle();

    await waitFor(async () => {
      const row = await getRow(id);
      expect(row?.retries).toBe(2);
    });

    const row = await getRow(id);
    expect(row?.status).toBe('PENDING');
    expect(new Date(row!.next_attempt_at as Date).getTime()).toBeGreaterThan(
      before,
    );
    expect(sendToDlqProducer).not.toHaveBeenCalled();
  });

  it('DLQ producer itself failing -> row is re-scheduled, not lost', async () => {
    (sendToDlqProducer as jest.Mock).mockRejectedValue(
      new Error('DLQ unavailable'),
    );
    const id = await insertOutbox({ retries: OUTBOX_MAX_RETRIES });

    runOnePollCycle();

    await waitFor(async () => {
      const row = await getRow(id);
      expect(row?.retries).toBe(OUTBOX_MAX_RETRIES + 1);
    });

    const row = await getRow(id);
    expect(row?.status).toBe('PENDING');
    expect(sendToDlqProducer).toHaveBeenCalled();
  });
});
