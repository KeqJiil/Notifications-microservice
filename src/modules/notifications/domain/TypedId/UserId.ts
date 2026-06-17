import { TypedId } from '@modules/notifications/domain/TypedId/TypedId.generic';
import { USER_ID } from '@/common/consts/TypedId.consts';

export class UserId extends TypedId<typeof USER_ID> {
  declare protected readonly type: typeof USER_ID;
  constructor(id: string) {
    super(id);
  }
}
