import Redis from 'ioredis';
import { env } from '@/common/secrets/env';

export const pub = new Redis(env.REDIS_URL, {
  lazyConnect: true,
  maxRetriesPerRequest: 5,
});

export const sub = new Redis(env.REDIS_URL, {
  lazyConnect: true,
  maxRetriesPerRequest: 5,
});
