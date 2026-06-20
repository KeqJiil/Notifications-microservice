import { IOutboxHandler } from '@modules/notifications/application/abstractions/outbox/IOutboxHandler.interface';
import { IOutboxRepository } from '@modules/notifications/application/abstractions/outbox/OutboxRepository.interface';
import { DualRecipientPayload } from '@modules/notifications/application/abstractions/incomingQueueTypes';
import { UoWInterface } from '@modules/notifications/application/abstractions/UoW.interface';

export class DualRecipientHandler implements IOutboxHandler<DualRecipientPayload> {
  constructor(
    private readonly outbox: IOutboxRepository,
    private readonly uow: UoWInterface,
  ) {}

  async handle(eventId: string, payload: DualRecipientPayload): Promise<void> {
    const { hostUserId, guestUserId, channel, message } = payload;
    const recipients = [
      { role: 'host', userId: hostUserId },
      { role: 'guest', userId: guestUserId },
    ];

    await this.uow.run(async () => {
      await Promise.all(
        recipients.flatMap(({ role, userId }) =>
          channel.map((ch) =>
            this.outbox.insert(`${eventId}:${role}:${ch}`, {
              userId,
              channel: ch,
              message,
            }),
          ),
        ),
      );
    });
  }
}
