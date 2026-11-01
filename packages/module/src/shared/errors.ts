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
