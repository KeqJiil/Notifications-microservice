export interface UoWInterface {
  run(action: () => Promise<void>): Promise<void>;
}
