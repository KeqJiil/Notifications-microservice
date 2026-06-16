import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    CREATE TABLE user_notifications (
       user_id UUID PRIMARY KEY NOT NULL,
       email VARCHAR(256) NOT NULL UNIQUE,
       phone_number VARCHAR(256) DEFAULT NULL,
       receive_phone_notifications BOOLEAN NOT NULL DEFAULT true,
       receive_email_notifications BOOLEAN NOT NULL DEFAULT true,
       receive_notifications BOOLEAN NOT NULL DEFAULT true,
       receive_important_messages BOOLEAN NOT NULL DEFAULT true,
       receive_not_important_messages BOOLEAN NOT NULL DEFAULT true,
       updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `.execute(db);

  await sql`
    CREATE OR REPLACE FUNCTION set_updated_at()
        RETURNS TRIGGER AS $$
    BEGIN
        NEW.updated_at = now();
        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql
  `.execute(db);

  await sql`
    CREATE TRIGGER trg_user_notifications_updated_at
        BEFORE UPDATE ON user_notifications
        FOR EACH ROW
    EXECUTE FUNCTION set_updated_at()
  `.execute(db);

  await sql`
    CREATE TABLE notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        event_id UUID NOT NULL,
        user_id UUID NOT NULL,
        payload jsonb DEFAULT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

        CONSTRAINT fk_notifications_user_notifications FOREIGN KEY (user_id) REFERENCES user_notifications(user_id)
            ON DELETE CASCADE
    )
  `.execute(db);

  await sql`
    CREATE TABLE inbox (
        event_id UUID NOT NULL PRIMARY KEY,
        success BOOLEAN NOT NULL DEFAULT false,
        stage VARCHAR(256) DEFAULT NULL,
        processed_at TIMESTAMPTZ DEFAULT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `.execute(db);

  await sql`
    CREATE TABLE outbox (
        event_id UUID NOT NULL PRIMARY KEY,
        payload jsonb NOT NULL,
        success BOOLEAN NOT NULL DEFAULT false,
        retries SMALLINT DEFAULT 0,
        processed_at TIMESTAMPTZ DEFAULT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `.execute(db);

  await sql`CREATE INDEX idx_notifications_user_id ON notifications(user_id)`.execute(db);
  await sql`CREATE INDEX idx_outbox_unprocessed ON outbox(processed_at) WHERE success = false`.execute(db);
  await sql`CREATE INDEX idx_inbox_unprocessed ON inbox(processed_at) WHERE success = false`.execute(db);
  await sql`CREATE UNIQUE INDEX idx_event_user_same ON notifications(event_id, user_id)`.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`DROP TABLE notifications, inbox, outbox, user_notifications CASCADE`.execute(db);
  await sql`DROP FUNCTION IF EXISTS set_updated_at`.execute(db);
}
