import type { Diagnostic, DiagnosticCode, LoadletError } from "../types.js";

export type EvaluationStage = "load" | "process";

export function createError(
  code: DiagnosticCode,
  message: string,
  details: Partial<Diagnostic> = {},
): LoadletError {
  const diagnostics: [Diagnostic, ...Diagnostic[]] = [{ code, message, ...details }];
  const error = new Error(
    message,
    "cause" in details ? { cause: details.cause } : undefined,
  ) as Error & {
    name: string;
    diagnostics: [Diagnostic, ...Diagnostic[]];
  };
  error.name = "LoadletError";
  error.diagnostics = diagnostics;
  return error as LoadletError;
}

export function createAbortedError(signal: AbortSignal): LoadletError {
  const reason = signal.reason;
  return createError("ABORTED", "Loadlet operation was aborted", {
    cause: reason instanceof Error ? reason : undefined,
  });
}

export function normalizeEvaluationError(
  error: unknown,
  stage: EvaluationStage,
  attempt: number,
): LoadletError {
  if (
    error instanceof Error &&
    error.name === "LoadletError" &&
    Array.isArray((error as LoadletError).diagnostics)
  ) {
    return error as LoadletError;
  }

  return createError(
    stage === "load" ? "LOAD_FAILED" : "PROCESS_FAILED",
    stage === "load"
      ? `Loader ${error instanceof Error ? error.message : "failed"}`
      : "Process failed",
    { cause: error, attempt },
  );
}
