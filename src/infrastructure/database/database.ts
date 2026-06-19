import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import { env } from '@/common/secrets/env';
import { DB } from '@/infrastructure/database/types';

export const db = new Kysely<DB>({
  dialect: new PostgresDialect({
    pool: new Pool({
      connectionString: env.DATABASE_URL,
      max: env.DATABASE_MAX_POOLS,
    }),
  }),
});
