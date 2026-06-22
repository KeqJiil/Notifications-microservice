import { ReservationPayload } from '@modules/notifications/application/abstractions/incomingQueueTypes';

export class ReservationUseCase {
  async execute(
    payload: ReservationPayload,
    eventId: string,
    createdAt: Date,
  ): Promise<void> {}
}
