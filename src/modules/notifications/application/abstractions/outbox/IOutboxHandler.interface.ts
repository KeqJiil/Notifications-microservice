export interface IOutboxHandler<T> {
  handle(eventId: string, payload: T): Promise<void>;
}
