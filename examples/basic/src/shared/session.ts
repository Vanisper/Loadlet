import type { Session, Snapshot } from "loadlet";

/** 等待满足条件的当前快照，用于观察 watcher 驱动的异步重载 */
export async function waitForSnapshot<Value>(
  session: Session<Value>,
  isExpected: (snapshot: Snapshot<Value>) => boolean,
): Promise<Snapshot<Value>> {
  const startedAt = Date.now();
  while (true) {
    if (isExpected(session.current)) return session.current;
    if (Date.now() - startedAt > 2000) {
      throw new Error(
        `Timed out waiting for the expected snapshot; current is ${JSON.stringify(session.current.value)}`,
      );
    }
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
}
