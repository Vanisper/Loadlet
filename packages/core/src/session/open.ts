import type { LoadRequest, ProcessedLoadRequest, Session, SessionOptions } from "../types.js";
import { type AnyRequest } from "../shared/request.js";
import { createSession } from "./engine.js";

export async function open<Source, Input, Output>(
  request: ProcessedLoadRequest<Source, Input, Output>,
  options: SessionOptions,
): Promise<Session<Output>>;
export async function open<Source, Value>(
  request: LoadRequest<Source, Value>,
  options: SessionOptions,
): Promise<Session<Value>>;
export async function open<Source, Value>(
  request: LoadRequest<Source, Value> | ProcessedLoadRequest<Source, unknown, Value>,
  options: SessionOptions,
): Promise<Session<Value>> {
  const engine = createSession<Value>(request as AnyRequest, options);
  try {
    await engine.opened;
    return engine.session;
  } catch (error) {
    await engine.session.close();
    throw error;
  }
}
