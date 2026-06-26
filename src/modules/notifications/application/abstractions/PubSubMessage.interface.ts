export interface PubSubMessage {
  id: string;
  userId: string;
  message: string;
  createdAt: string;
  idempotencyKey: string;
}
