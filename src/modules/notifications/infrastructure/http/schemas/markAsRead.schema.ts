import { z } from 'zod';
import { MARK_AS_READ_MAX_IDS } from '@/common/consts/feedConsts';

export const markAsReadBodySchema = z.object({
  ids: z.array(z.uuid()).min(1).max(MARK_AS_READ_MAX_IDS),
});
