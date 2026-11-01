import type { EvaluationContext, LoadRequest, ProcessedLoadRequest } from "../types.js";
import { createAbortedError } from "./errors.js";

export type AnyRequest =
  | LoadRequest<unknown, unknown>
  | ProcessedLoadRequest<unknown, unknown, unknown>;
export type EvaluationOutcome<Value> =
  | { readonly stage: "loaded"; readonly value: Value }
  | { readonly stage: "processed"; readonly value: Value };

export async function evaluateRequest<Value>(
  request: AnyRequest,
  context: EvaluationContext,
  signal: AbortSignal,
  onStageChange?: (stage: "process") => void,
): Promise<EvaluationOutcome<Value>> {
  const loaded = await request.loader.load(request.source, context);
  if (signal.aborted) throw createAbortedError(signal);
  onStageChange?.("process");

  if (!("process" in request) || !request.process) {
    return { stage: "loaded", value: loaded as Value };
  }

  const value = await (request as ProcessedLoadRequest<unknown, unknown, Value>).process(
    loaded,
    context,
  );
  if (signal.aborted) throw createAbortedError(signal);
  return { stage: "processed", value };
}
