import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await sql`ALTER TABLE outbox RENAME COLUMN event_id TO id`.execute(db);
  await sql`ALTER TABLE outbox ALTER COLUMN id SET DEFAULT gen_random_uuid()`.execute(
    db,
  );

  await sql`ALTER TABLE outbox ADD COLUMN event_id VARCHAR(255)`.execute(db);
  await sql`ALTER TABLE outbox ALTER COLUMN event_id SET NOT NULL`.execute(
    db,
  );
  await sql`ALTER TABLE outbox ADD CONSTRAINT ux_outbox_event_id UNIQUE (event_id)`.execute(
    db,
  );

  await sql`ALTER TABLE outbox RENAME COLUMN processed_at TO next_attempt_at`.execute(
    db,
  );

  await sql`ALTER TABLE inbox ADD CONSTRAINT fk_inbox_outbox FOREIGN KEY (event_id) REFERENCES outbox(id) ON DELETE CASCADE`.execute(
    db,
  );
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`ALTER TABLE inbox DROP CONSTRAINT fk_inbox_outbox`.execute(db);

  await sql`ALTER TABLE outbox RENAME COLUMN next_attempt_at TO processed_at`.execute(
    db,
  );
  await sql`ALTER TABLE outbox DROP CONSTRAINT ux_outbox_event_id`.execute(
    db,
  );
  await sql`ALTER TABLE outbox DROP COLUMN event_id`.execute(db);
  await sql`ALTER TABLE outbox ALTER COLUMN id DROP DEFAULT`.execute(db);
  await sql`ALTER TABLE outbox RENAME COLUMN id TO event_id`.execute(db);
}
