import { EventEmitter } from 'node:events';
import { randomUUID } from 'node:crypto';
import { FastifyReply, FastifyRequest } from 'fastify';
import Redis from 'ioredis';
import { startTestRedis, TestRedis } from '../setup/redis';
import { RedisPubSubFanOutService } from '@modules/notifications/infrastructure/redis/RedisPubSubFanOut.service';
import { SSEFastifyPort } from '@modules/notifications/infrastructure/http/SSEFastifyPort';
import { CHANNEL_NAME } from '@/common/consts/PubSub.consts';
import { PubSubMessage } from '@modules/notifications/application/abstractions/PubSubMessage.interface';

jest.setTimeout(60_000);

async function waitFor(
  assertion: () => void | Promise<void>,
  timeoutMs = 5_000,
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

function makeMessage(userId: string): PubSubMessage {
  return {
    id: randomUUID(),
    userId,
    message: 'hello',
    createdAt: new Date().toISOString(),
    idempotencyKey: randomUUID(),
  };
}

describe('SSE stream (e2e)', () => {
  let redis: TestRedis;
  let publisher: Redis;
  let subscriber: Redis;
  let fanout: RedisPubSubFanOutService;
  let port: SSEFastifyPort;

  beforeAll(async () => {
    redis = await startTestRedis();
    publisher = redis.createClient();
    subscriber = redis.createClient();
    fanout = new RedisPubSubFanOutService(publisher, subscriber);
    port = new SSEFastifyPort(fanout);
  });

  afterAll(async () => {
    await redis.teardown();
  });

  async function openConnection(userId: string) {
    const received: PubSubMessage[] = [];
    const rawReq = new EventEmitter();

    const request = {
      user: { userId },
      raw: rawReq,
    } as unknown as FastifyRequest;

    const reply = {
      raw: {
        writeHead: () => {},
        write: (chunk: string) => {
          const json = chunk.replace(/^data: /, '').trim();
          received.push(JSON.parse(json) as PubSubMessage);
          return true;
        },
      },
    } as unknown as FastifyReply;

    await port.handle(request, reply);

    return { received, close: () => rawReq.emit('close') };
  }

  function activeChannels(): Promise<string[]> {
    return publisher.pubsub('CHANNELS', 'user:*') as Promise<string[]>;
  }

  it('a connected client receives an event published to its userId channel', async () => {
    const userId = randomUUID();
    const conn = await openConnection(userId);
    const msg = makeMessage(userId);

    await fanout.pub(CHANNEL_NAME(userId), msg);

    await waitFor(() => {
      expect(conn.received).toContainEqual(msg);
    });
  });

  it("a client does NOT receive events published to another user's channel", async () => {
    const userA = randomUUID();
    const userB = randomUUID();
    const connA = await openConnection(userA);
    const connB = await openConnection(userB);

    const msgForB = makeMessage(userB);
    await fanout.pub(CHANNEL_NAME(userB), msgForB);

    // Once B has the message we know it has propagated through Redis; A must not
    // have seen it (same publisher connection => ordered delivery).
    await waitFor(() => {
      expect(connB.received).toContainEqual(msgForB);
    });
    expect(connA.received).toHaveLength(0);
  });

  it('the connection is cleaned up on client disconnect (no leaked subscriptions)', async () => {
    const userId = randomUUID();
    const channel = CHANNEL_NAME(userId);
    const conn = await openConnection(userId);

    // Sanity: while connected, the channel has an active Redis subscription.
    await waitFor(async () => {
      expect(await activeChannels()).toContain(channel);
    });

    conn.close();

    // After disconnect the fan-out must unsubscribe — no leaked subscription.
    await waitFor(async () => {
      expect(await activeChannels()).not.toContain(channel);
    });

    // And a later publish to that channel reaches nobody / is not written out.
    const before = conn.received.length;
    await fanout.pub(channel, makeMessage(userId));
    await new Promise((r) => setTimeout(r, 200));
    expect(conn.received).toHaveLength(before);
  });
});
