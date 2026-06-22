export interface PubSubMessage {
  userId: string;
  message: string;
  createdAt: string;
  idempotencyKey: string;
}
