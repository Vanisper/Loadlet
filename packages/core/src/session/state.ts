import type { LoadletError, Session, Snapshot } from "../types.js";

export type SessionState = Session<unknown>["state"];
export type CloseReason = "explicit" | "aborted";

export interface ReloadWaiter {
  resolve: (snapshot: Snapshot<unknown>) => void;
  reject: (error: LoadletError) => void;
}

export interface SessionEngineResult<Value> {
  readonly session: Session<Value>;
  readonly opened: Promise<void>;
}
