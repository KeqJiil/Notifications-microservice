import { z } from 'zod';

export const feedQuerySchema = z.object({
  cursor: z.string().optional(),
  isRead: z.enum(['true', 'false']).optional(),
});
