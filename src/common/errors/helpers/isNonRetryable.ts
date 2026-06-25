import { ZodError } from 'zod';
import { NonRetryableException } from '@/common/errors/NonRetryable.exception';

export function isNonRetryableError(err: unknown): boolean {
  return (
    err instanceof SyntaxError ||
    err instanceof ZodError ||
    err instanceof NonRetryableException
  );
}
