import { createError } from "./errors.js";

export function normalizeDependency(file: URL, attempt?: number): string {
  if (file.protocol !== "file:" || file.search !== "" || file.hash !== "") {
    const details: { file: string; attempt?: number } = { file: file.href };
    if (attempt !== undefined) details.attempt = attempt;
    throw createError("INVALID_DEPENDENCY", "Dependency must be an absolute file URL", details);
  }
  return file.href;
}
