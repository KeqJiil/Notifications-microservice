export abstract class BasicEvent {
  protected constructor(public readonly eventName: symbol) {}
}
