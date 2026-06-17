import { BasicEvent } from '@modules/notifications/domain/events/BasicEvent';

export abstract class AggregateRoot {
  private _events: BasicEvent[] = [];

  protected apply(event: BasicEvent): void {
    this._events.push(event);
  }

  public getAllEvents(): BasicEvent[] {
    return [...this._events];
  }

  public getAllEventsAndReset(): BasicEvent[] {
    const events = this._events;
    this._events = [];
    return events;
  }
}
