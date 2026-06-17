import { BasicEvent } from '@modules/notifications/domain/events/BasicEvent';
import { NotificationAccountCreated } from '@/common/consts/EventNames.consts';
import { UserId } from '@modules/notifications/domain/TypedId/UserId';

export class NotificationAccountCreatedEvent extends BasicEvent {
  constructor(public readonly aggregateId: UserId) {
    super(NotificationAccountCreated);
  }
}
