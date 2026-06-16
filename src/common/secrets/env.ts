import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['dev', 'production']),
  PORT: z.coerce.number(),

  DATABASE_URL: z.string(),
  DATABASE_MAX_POOLS: z.coerce.number(),

  REDIS_URL: z.string(),

  KAFKA_BROKERS: z.string().transform((s) => s.split(',')),
  KAFKA_CLIENT_ID: z.string().default('notification-service'),

  RESEND_PASSWORD: z.string(),
  RESEND_EMAIL: z.email(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error(parsed.error.message);
  process.exit(1);
}

export const env = parsed.data;
