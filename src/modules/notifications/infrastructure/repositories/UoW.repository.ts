import { UoWInterface } from '@modules/notifications/application/abstractions/UoW.interface';
import { DB } from '@/infrastructure/database/types';
import { KyselyTransactionContext } from '@modules/notifications/infrastructure/repositories/kyselyTransactionContext';
import { IsolationLevel, Kysely } from 'kysely';

export class UoWRepository implements UoWInterface {
  constructor(
    private readonly db: Kysely<DB>,
    private readonly txContext: KyselyTransactionContext,
  ) {}

  async run(
    action: () => Promise<void>,
    isolationLevel: IsolationLevel = 'read committed',
  ): Promise<void> {
    await this.db
      .transaction()
      .setIsolationLevel(isolationLevel)
      .execute(async (tx) => {
        await this.txContext.run(tx, action);
      });
  }
}
