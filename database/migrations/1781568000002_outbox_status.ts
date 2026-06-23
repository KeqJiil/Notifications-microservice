import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await sql`DROP INDEX IF EXISTS idx_outbox_unprocessed`.execute(db);

  await sql`
    CREATE TYPE outbox_status AS ENUM ('PENDING', 'SUCCESS', 'DEAD')
  `.execute(db);

  await sql`ALTER TABLE outbox RENAME COLUMN success TO status`.execute(db);

  await sql`ALTER TABLE outbox ALTER COLUMN status DROP DEFAULT`.execute(db);

  await sql`
    ALTER TABLE outbox
      ALTER COLUMN status TYPE outbox_status
        USING (
          CASE
            WHEN status = true THEN 'SUCCESS'::outbox_status
            ELSE 'PENDING'::outbox_status
          END
        )
  `.execute(db);

  await sql`
    ALTER TABLE outbox ALTER COLUMN status SET DEFAULT 'PENDING'
  `.execute(db);

  await sql`
    CREATE INDEX idx_outbox_unprocessed
      ON outbox(next_attempt_at)
      WHERE status = 'PENDING'
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`DROP INDEX IF EXISTS idx_outbox_unprocessed`.execute(db);

  await sql`ALTER TABLE outbox ALTER COLUMN status DROP DEFAULT`.execute(db);

  await sql`
    ALTER TABLE outbox
      ALTER COLUMN status TYPE BOOLEAN
        USING (status = 'SUCCESS'::outbox_status)
  `.execute(db);

  await sql`ALTER TABLE outbox ALTER COLUMN status SET DEFAULT false`.execute(
    db,
  );

  await sql`ALTER TABLE outbox RENAME COLUMN status TO success`.execute(db);

  await sql`DROP TYPE outbox_status`.execute(db);

  await sql`
    CREATE INDEX idx_outbox_unprocessed
      ON outbox(next_attempt_at)
      WHERE success = false
  `.execute(db);
}
