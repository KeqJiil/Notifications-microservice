import { KafkaMessage } from 'kafkajs';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import { processKafkaMessage } from '@modules/notifications/infrastructure/kafka/consumers/processKafkaMessage';
import { EventDispatcher } from '@modules/notifications/infrastructure/kafka/dispatchers/event.dispatcher';
import { sendToDlqProducer } from '@modules/notifications/infrastructure/kafka/producer/dlq.producer';
import { NonRetryableException } from '@/common/errors/NonRetryable.exception';
import { KAFKA_INCOMING_DLQ_TOPIC } from '@/common/consts/infrastucture.consts';

jest.mock(
  '@modules/notifications/infrastructure/kafka/producer/dlq.producer',
  () => ({
    sendToDlqProducer: jest.fn().mockResolvedValue(undefined),
  }),
);
jest.mock('@/app/logger', () => ({
  logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));

function createMessage(value: string | null): KafkaMessage {
  return {
    value: value === null ? null : Buffer.from(value),
    offset: '1',
  } as unknown as KafkaMessage;
}

function createRateLimiter(): RateLimiterMemory {
  return {
    consume: jest.fn().mockResolvedValue(undefined),
  } as unknown as RateLimiterMemory;
}

function createDispatcher(): EventDispatcher {
  return {
    process: jest.fn().mockResolvedValue(undefined),
  } as unknown as EventDispatcher;
}

describe('processKafkaMessage', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('null message value -> {shouldCommit:true, shouldStopBatch:false}, dispatcher not called', async () => {
    const dispatcher = createDispatcher();
    const rateLimiter = createRateLimiter();

    const result = await processKafkaMessage(
      createMessage(null),
      'booking.auth',
      dispatcher,
      rateLimiter,
    );

    expect(result).toEqual({ shouldCommit: true, shouldStopBatch: false });
    expect(dispatcher.process).not.toHaveBeenCalled();
  });

  it('rate limiter rejects -> {shouldCommit:false, shouldStopBatch:true}, dispatcher not called', async () => {
    const dispatcher = createDispatcher();
    const rateLimiter = {
      consume: jest.fn().mockRejectedValue(new Error('rejected')),
    } as unknown as RateLimiterMemory;

    const resultPromise = processKafkaMessage(
      createMessage(
        JSON.stringify({ eventId: '1', type: 'password_changed', payload: {} }),
      ),
      'booking.auth',
      dispatcher,
      rateLimiter,
    );
    await jest.runAllTimersAsync();
    const result = await resultPromise;

    expect(result).toEqual({ shouldCommit: false, shouldStopBatch: true });
    expect(dispatcher.process).not.toHaveBeenCalled();
  });

  it('invalid JSON -> SyntaxError -> sent to DLQ, shouldCommit:true', async () => {
    const dispatcher = createDispatcher();
    const rateLimiter = createRateLimiter();

    const resultPromise = processKafkaMessage(
      createMessage('not-json{'),
      'booking.auth',
      dispatcher,
      rateLimiter,
    );
    await jest.runAllTimersAsync();
    const result = await resultPromise;

    expect(result).toEqual({ shouldCommit: true, shouldStopBatch: false });
    expect(sendToDlqProducer).toHaveBeenCalledWith(
      [expect.anything()],
      KAFKA_INCOMING_DLQ_TOPIC,
    );
    expect(dispatcher.process).not.toHaveBeenCalled();
  });

  it('unknown event type -> ZodError -> sent to DLQ, shouldCommit:true', async () => {
    const dispatcher = createDispatcher();
    const rateLimiter = createRateLimiter();

    const resultPromise = processKafkaMessage(
      createMessage(
        JSON.stringify({ eventId: '1', type: 'not_a_real_type', payload: {} }),
      ),
      'booking.auth',
      dispatcher,
      rateLimiter,
    );
    await jest.runAllTimersAsync();
    const result = await resultPromise;

    expect(result).toEqual({ shouldCommit: true, shouldStopBatch: false });
    expect(sendToDlqProducer).toHaveBeenCalledWith(
      [expect.anything()],
      KAFKA_INCOMING_DLQ_TOPIC,
    );
    expect(dispatcher.process).not.toHaveBeenCalled();
  });

  it('dispatcher throws NonRetryableException -> sent to DLQ, shouldCommit:true', async () => {
    const dispatcher = {
      process: jest.fn().mockRejectedValue(new NonRetryableException('bad')),
    } as unknown as EventDispatcher;
    const rateLimiter = createRateLimiter();

    const resultPromise = processKafkaMessage(
      createMessage(
        JSON.stringify({
          eventId: '1',
          type: 'password_changed',
          payload: { userId: 'user-1', channel: ['email'], message: 'hi' },
        }),
      ),
      'booking.auth',
      dispatcher,
      rateLimiter,
    );
    await jest.runAllTimersAsync();
    const result = await resultPromise;

    expect(result).toEqual({ shouldCommit: true, shouldStopBatch: false });
    expect(sendToDlqProducer).toHaveBeenCalledWith(
      [expect.anything()],
      KAFKA_INCOMING_DLQ_TOPIC,
    );
  });

  it('dispatcher throws generic Error -> NOT in DLQ, {shouldCommit:false, shouldStopBatch:true}', async () => {
    const dispatcher = {
      process: jest.fn().mockRejectedValue(new Error('boom')),
    } as unknown as EventDispatcher;
    const rateLimiter = createRateLimiter();

    const resultPromise = processKafkaMessage(
      createMessage(
        JSON.stringify({
          eventId: '1',
          type: 'password_changed',
          payload: { userId: 'user-1', channel: ['email'], message: 'hi' },
        }),
      ),
      'booking.auth',
      dispatcher,
      rateLimiter,
    );
    await jest.runAllTimersAsync();
    const result = await resultPromise;

    expect(result).toEqual({ shouldCommit: false, shouldStopBatch: true });
    expect(sendToDlqProducer).not.toHaveBeenCalled();
  });

  it('happy path -> dispatcher called with assembled Event, shouldCommit:true', async () => {
    const dispatcher = createDispatcher();
    const rateLimiter = createRateLimiter();
    const envelope = {
      eventId: '1',
      type: 'password_changed',
      payload: { userId: 'user-1', channel: ['email'], message: 'hi' },
    };

    const result = await processKafkaMessage(
      createMessage(JSON.stringify(envelope)),
      'booking.auth',
      dispatcher,
      rateLimiter,
    );

    expect(result).toEqual({ shouldCommit: true, shouldStopBatch: false });
    expect(dispatcher.process).toHaveBeenCalledWith(
      'password_changed',
      expect.objectContaining({
        eventId: '1',
        type: 'password_changed',
        payload: envelope.payload,
      }),
    );
  });
});
