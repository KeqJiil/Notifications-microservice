import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await sql`DROP INDEX IF EXISTS idx_event_user_same`.execute(db);

  await sql`ALTER TABLE notifications RENAME COLUMN event_id TO idempotency_key`.execute(
    db,
  );
  await sql`ALTER TABLE notifications ALTER COLUMN idempotency_key TYPE VARCHAR(255)`.execute(
    db,
  );

  await sql`
    CREATE UNIQUE INDEX idx_notifications_idempotency_key
      ON notifications(idempotency_key)
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`DROP INDEX IF EXISTS idx_notifications_idempotency_key`.execute(
    db,
  );

  await sql`ALTER TABLE notifications ALTER COLUMN idempotency_key TYPE UUID USING idempotency_key::uuid`.execute(
    db,
  );
  await sql`ALTER TABLE notifications RENAME COLUMN idempotency_key TO event_id`.execute(
    db,
  );

  await sql`
    CREATE UNIQUE INDEX idx_event_user_same
      ON notifications(event_id, user_id)
  `.execute(db);
}
