export interface INotificationStrategy {
  send(email: string): Promise<unknown>;
}
