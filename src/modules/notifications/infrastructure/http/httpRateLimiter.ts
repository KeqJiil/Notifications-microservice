import { RateLimiterMemory } from 'rate-limiter-flexible';
import { httpRateLimiterConfig } from '@modules/notifications/infrastructure/rateLimiter/configs';

export const httpRateLimiter = new RateLimiterMemory(httpRateLimiterConfig);
