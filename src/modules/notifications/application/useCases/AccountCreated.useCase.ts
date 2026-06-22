import { AccountCreatedPayload } from '@modules/notifications/application/abstractions/incomingQueueTypes';

export class AccountCreatedUseCase {
  async execute(payload: AccountCreatedPayload): Promise<void> {}
}
