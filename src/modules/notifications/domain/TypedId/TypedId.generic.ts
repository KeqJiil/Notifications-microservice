export abstract class TypedId<T extends symbol> {
  declare protected readonly type: T;

  protected constructor(public readonly id: string) {}

  equals(other: this): boolean {
    return this.id === other.id;
  }

  toString(): string {
    return this.id;
  }
}
