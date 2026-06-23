import { UseCaseDispatcher } from '@modules/notifications/application/services/useCase.dispatcher';
import { OutboxRecord } from '@modules/notifications/application/abstractions/outbox/OutboxRecord.interface';
import { NonRetryableException } from '@/common/errors/NonRetryable.exception';
import { logger } from '@/app/logger';
import { IOutboxRepository } from '@modules/notifications/application/abstractions/outbox/OutboxRepository.interface';
import {
  OUTBOX_BATCH_LIMIT,
  OUTBOX_MAX_RETRIES,
} from '@/common/consts/outboxConsts';
import { getJitterDelay } from '@modules/notifications/infrastructure/repositories/outbox/jitter';
import { sendToDlqProducer } from '@modules/notifications/infrastructure/kafka/producer/dlq.producer';
import { Message } from 'kafkajs';

export class OutboxPoller {
  private running = false;
  private loopPromise?: Promise<void>;
  private wakeUp?: () => void;

  constructor(
    private readonly useCaseDispatcher: UseCaseDispatcher,
    private readonly outbox: IOutboxRepository,
  ) {}

  start(intervalMs = 2000) {
    if (this.running) return;
    this.running = true;
    this.loopPromise = this.loop(intervalMs);
  }

  async stop() {
    this.running = false;
    this.wakeUp?.();
    await this.loopPromise;
  }

  private async loop(intervalMs: number) {
    while (this.running) {
      try {
        await this.claim();
      } catch (error) {
        logger.error(error);
      }
      if (!this.running) break;
      await this.sleep(intervalMs);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
      const t = setTimeout(resolve, ms);
      this.wakeUp = () => {
        clearTimeout(t);
        resolve();
      };
    });
  }

  private async claim() {
    const batch = await this.outbox.claimBatch(OUTBOX_BATCH_LIMIT);
    const promises = batch.map(async (outbox) => this.pool(outbox));
    await Promise.allSettled(promises);
  }

  private async pool(outboxRecord: OutboxRecord): Promise<void> {
    if (outboxRecord.retries >= OUTBOX_MAX_RETRIES) {
      logger.warn(
        `Outbox ${outboxRecord.id} ${OUTBOX_MAX_RETRIES} retries reached`,
      );
      await this.moveToDeadLetter(
        outboxRecord,
        new Error('Max retries reached'),
      );
      return;
    }
    try {
      await this.useCaseDispatcher.handle(
        outboxRecord.payload.type,
        outboxRecord,
      );
      await this.outbox.markSucceed(outboxRecord.id);
    } catch (error) {
      if (error instanceof NonRetryableException) {
        logger.warn(`Non retryable exception: ${error.message}`);
        await this.moveToDeadLetter(outboxRecord, error);
        return;
      }
      const delay = new Date(getJitterDelay(outboxRecord.retries) + Date.now());
      await this.outbox.retry(outboxRecord.id, delay);
    }
  }

  private async moveToDeadLetter(
    record: OutboxRecord,
    error: Error,
  ): Promise<void> {
    try {
      await this.sendToDlq(record, error);
      await this.outbox.markDead(record.id);
    } catch (dlqError) {
      logger.fatal(
        `DLQ unavailable, deferring outbox ${record.id}: ${
          dlqError instanceof Error ? dlqError.message : String(dlqError)
        }`,
      );
      const delay = new Date(getJitterDelay(OUTBOX_MAX_RETRIES) + Date.now());
      await this.outbox.retry(record.id, delay);
    }
  }

  private async sendToDlq(record: OutboxRecord, error: Error): Promise<void> {
    const message: Message = {
      headers: {
        error: error.message,
        originalId: record.id,
        timestamp: new Date().toISOString(),
      },
      value: JSON.stringify(record),
    };
    await sendToDlqProducer([message]);
    logger.error(`Outbox ${record.id} moved to DLQ`);
  }
}
