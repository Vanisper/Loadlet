import type {
  EvaluationContext,
  LoadRequest,
  OperationOptions,
  ProcessedLoadRequest,
  Snapshot,
} from "./types.js";
import { linkSignal } from "./shared/cancellation.js";
import { normalizeDependency } from "./shared/dependency.js";
import { createAbortedError, createError, normalizeEvaluationError } from "./shared/errors.js";
import { type AnyRequest, evaluateRequest } from "./shared/request.js";
import { createSnapshot } from "./shared/snapshot.js";

export async function load<Source, Input, Output>(
  request: ProcessedLoadRequest<Source, Input, Output>,
  options?: OperationOptions,
): Promise<Snapshot<Output>>;
export async function load<Source, Value>(
  request: LoadRequest<Source, Value>,
  options?: OperationOptions,
): Promise<Snapshot<Value>>;
export async function load<Source, Value>(
  request: LoadRequest<Source, Value> | ProcessedLoadRequest<Source, unknown, Value>,
  options?: OperationOptions,
): Promise<Snapshot<Value>> {
  if (options?.signal?.aborted) throw createAbortedError(options.signal);
  const cancellation = linkSignal(options?.signal);
  const dependencies = new Set<string>();
  let contextEnded = false;
  let stage: "load" | "process" = "load";

  const context: EvaluationContext = {
    attempt: 1,
    signal: cancellation.signal,
    track: async (file) => {
      if (contextEnded) throw createError("SESSION_CLOSED", "Evaluation context has ended");
      dependencies.add(normalizeDependency(file));
    },
  };

  try {
    const outcome = await evaluateRequest<Value>(
      request as AnyRequest,
      context,
      cancellation.signal,
      () => {
        stage = "process";
      },
    );
    return createSnapshot(crypto.randomUUID(), 1, 1, outcome.value, dependencies);
  } catch (error) {
    if (cancellation.signal.aborted) throw createAbortedError(cancellation.signal);
    throw normalizeEvaluationError(error, stage, 1);
  } finally {
    contextEnded = true;
    cancellation.dispose();
  }
}
