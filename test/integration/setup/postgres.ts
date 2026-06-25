import { promises as fs } from 'node:fs';
import path from 'node:path';
import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { Kysely, PostgresDialect } from 'kysely';
import { FileMigrationProvider, Migrator } from 'kysely/migration';
import { Pool } from 'pg';
import { DB } from '@/infrastructure/database/types';

export interface TestPostgres {
  container: StartedPostgreSqlContainer;
  db: Kysely<DB>;
  teardown: () => Promise<void>;
}

export async function startTestPostgres(): Promise<TestPostgres> {
  const container = await new PostgreSqlContainer('postgres:16').start();

  const db = new Kysely<DB>({
    dialect: new PostgresDialect({
      pool: new Pool({ connectionString: container.getConnectionUri() }),
    }),
  });

  const migrator = new Migrator({
    db,
    provider: new FileMigrationProvider({
      fs,
      path,
      migrationFolder: path.resolve(__dirname, '../../../database/migrations'),
    }),
  });

  const { error } = await migrator.migrateToLatest();
  if (error) {
    throw error instanceof Error ? error : new Error(JSON.stringify(error));
  }

  const teardown = async () => {
    await db.destroy();
    await container.stop();
  };

  return { container, db, teardown };
}

export async function truncateAll(db: Kysely<DB>): Promise<void> {
  await db.deleteFrom('notifications').execute();
  await db.deleteFrom('outbox').execute();
  await db.deleteFrom('inbox').execute();
  await db.deleteFrom('user_notifications').execute();
}
