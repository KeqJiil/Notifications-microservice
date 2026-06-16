import Redis from 'ioredis';
import { env } from '@/common/secrets/env';

export const redis = new Redis(env.REDIS_URL, {
  lazyConnect: true,
  maxRetriesPerRequest: 5,
});
