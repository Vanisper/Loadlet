import type { Diagnostic, DiagnosticCode, LoadletError } from "loadlet";

export function createAdapterError(
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

export function isAdapterError(error: unknown): error is LoadletError {
  return (
    error instanceof Error &&
    error.name === "LoadletError" &&
    Array.isArray((error as LoadletError).diagnostics)
  );
}

export function appendDiagnostic(error: LoadletError, diagnostic: Diagnostic): LoadletError {
  const result = new Error(error.message, { cause: error.cause }) as Error & {
    name: string;
    diagnostics: [Diagnostic, ...Diagnostic[]];
  };
  result.name = error.name;
  result.diagnostics = [...error.diagnostics, diagnostic];
  return result as LoadletError;
}
