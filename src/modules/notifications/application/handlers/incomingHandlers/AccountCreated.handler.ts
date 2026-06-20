import { IOutboxHandler } from '@modules/notifications/application/abstractions/outbox/IOutboxHandler.interface';
import { IOutboxRepository } from '@modules/notifications/application/abstractions/outbox/OutboxRepository.interface';
import { AccountCreatedPayload } from '@modules/notifications/application/abstractions/incomingQueueTypes';
import { UoWInterface } from '@modules/notifications/application/abstractions/UoW.interface';

export class AccountCreatedHandler
  implements IOutboxHandler<AccountCreatedPayload>
{
  constructor(
    private readonly outbox: IOutboxRepository,
    private readonly uow: UoWInterface,
  ) {}

  async handle(eventId: string, payload: AccountCreatedPayload): Promise<void> {
    await this.uow.run(async () => {
      await this.outbox.insert(eventId, payload);
    });
  }
}
