export interface IInboxRecord {
  id: string;
  success: boolean;
  stage: string | null;
  processedAt: Date | null;
  createdAt: Date;
}
