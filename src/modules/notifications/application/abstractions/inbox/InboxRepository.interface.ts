import { IInboxRecord } from '@modules/notifications/application/abstractions/inbox/InboxRecord.interface';

export interface IInboxRepository {
  insert(id: string): Promise<void>;
  changeStage(id: string, stage: string): Promise<void>;
  markSuccess(id: string): Promise<void>;
  get(id: string): Promise<IInboxRecord | null>;
}
