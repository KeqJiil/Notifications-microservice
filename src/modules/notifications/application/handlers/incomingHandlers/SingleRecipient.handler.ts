import { IOutboxHandler } from '@modules/notifications/application/abstractions/outbox/IOutboxHandler.interface';
import { IOutboxRepository } from '@modules/notifications/application/abstractions/outbox/OutboxRepository.interface';
import { SingleRecipientPayload } from '@modules/notifications/application/abstractions/incomingQueueTypes';
import { UoWInterface } from '@modules/notifications/application/abstractions/UoW.interface';

export class SingleRecipientHandler
  implements IOutboxHandler<SingleRecipientPayload>
{
  constructor(
    private readonly outbox: IOutboxRepository,
    private readonly uow: UoWInterface,
  ) {}

  async handle(eventId: string, payload: SingleRecipientPayload): Promise<void> {
    const { userId, channel, message } = payload;
    await this.uow.run(async () => {
      await Promise.all(
        channel.map((ch) =>
          this.outbox.insert(`${eventId}:${ch}`, { userId, channel: ch, message }),
        ),
      );
    });
  }
}
