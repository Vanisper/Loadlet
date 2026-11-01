import { readFile } from "node:fs/promises";
import type { EvaluationContext } from "loadlet";
import { createAdapterError } from "../shared/errors.js";

const importPatterns = [
  /\bimport\s+(?!type\b)[^'";]+?\sfrom\s*(['"])([^'"]+)\1/g,
  /\bexport\s+(?!type\b)[^'";]+?\sfrom\s*(['"])([^'"]+)\1/g,
  /\bimport\s*(['"])([^'"]+)\1/g,
  /\bimport\s*\(\s*(['"])([^'"]+)\1\s*\)/g,
] as const;

function parseImportSpecifiers(code: string): string[] {
  const specifiers = new Set<string>();
  for (const pattern of importPatterns) {
    for (const match of code.matchAll(pattern)) {
      const specifier = match[2];
      if (specifier) specifiers.add(specifier);
    }
  }
  return [...specifiers];
}

function isRelativeImport(specifier: string): boolean {
  return specifier.startsWith("./") || specifier.startsWith("../") || specifier.startsWith("/");
}

export async function trackLocalImportGraph(
  source: URL,
  context: EvaluationContext,
): Promise<void> {
  const pending = [source];
  const visited = new Set<string>();

  while (pending.length > 0) {
    const file = pending.shift()!;
    if (visited.has(file.href)) continue;
    visited.add(file.href);

    await context.track(file);
    let code: string;
    try {
      code = await readFile(file, "utf8");
    } catch (error) {
      throw createAdapterError("LOAD_FAILED", "Failed to read module source", {
        cause: error,
        file: file.href,
      });
    }

    for (const specifier of parseImportSpecifiers(code)) {
      if (!isRelativeImport(specifier)) continue;
      const dependency = new URL(specifier, file);
      if (!visited.has(dependency.href)) pending.push(dependency);
    }
  }
}
