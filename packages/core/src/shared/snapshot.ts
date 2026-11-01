import type { Snapshot } from "../types.js";

export function createSnapshot<Value>(
  id: string,
  version: number,
  attempt: number,
  value: Value,
  dependencies: ReadonlySet<string>,
): Snapshot<Value> {
  return Object.freeze({
    id,
    version,
    attempt,
    value,
    dependencies: Object.freeze([...dependencies].sort()),
  });
}
