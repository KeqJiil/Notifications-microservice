export interface INotificationStrategy<T> {
  send(data: T): Promise<void>;
}
