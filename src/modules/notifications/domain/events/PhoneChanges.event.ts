import { BasicEvent } from '@modules/notifications/domain/events/BasicEvent';
import { PhoneChanged } from '@/common/consts/EventNames.consts';
import { UserId } from '@modules/notifications/domain/TypedId/UserId';

export class PhoneNumberChangedEvent extends BasicEvent {
  constructor(
    public readonly aggregateId: UserId,
    public readonly newPhoneNumber: string,
  ) {
    super(PhoneChanged);
  }
}
