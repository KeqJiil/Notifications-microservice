import { AsyncLocalStorage } from 'node:async_hooks';
import { Transaction } from 'kysely';
import { DB } from '@/infrastructure/database/types';

export class KyselyTransactionContext {
  private readonly als = new AsyncLocalStorage<Transaction<DB>>();

  run<T>(tx: Transaction<DB>, fn: () => Promise<T>): Promise<T> {
    return this.als.run(tx, fn);
  }

  getActiveTransaction(): Transaction<DB> | undefined {
    return this.als.getStore();
  }
}
