import { readFile } from "node:fs/promises";
import type { EvaluationContext } from "loadlet";
import { createAdapterError } from "../shared/errors.js";

export interface ModuleSource {
  readonly url: URL;
  readonly code: string;
}

const importPatterns = [
  /\b(import\s+(?!type\b)[^'";]+?\sfrom\s*)(['"])([^'"]+)\2/g,
  /\b(export\s+(?!type\b)[^'";]+?\sfrom\s*)(['"])([^'"]+)\2/g,
  /\b(import\s*)(['"])([^'"]+)\2/g,
  /\b(import\s*\(\s*)(['"])([^'"]+)\2\s*\)/g,
] as const;

function parseImportSpecifiers(code: string): string[] {
  const specifiers = new Set<string>();
  for (const pattern of importPatterns) {
    for (const match of code.matchAll(pattern)) {
      const specifier = match[3];
      if (specifier) specifiers.add(specifier);
    }
  }
  return [...specifiers];
}

function isRelativeImport(specifier: string): boolean {
  return specifier.startsWith("./") || specifier.startsWith("../") || specifier.startsWith("/");
}

export async function collectLocalImportGraph(
  source: URL,
  context: EvaluationContext,
): Promise<ModuleSource[]> {
  const pending = [source];
  const visited = new Set<string>();
  const modules: ModuleSource[] = [];

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
    modules.push({ url: file, code });

    for (const specifier of parseImportSpecifiers(code)) {
      if (!isRelativeImport(specifier)) continue;
      const dependency = new URL(specifier, file);
      if (!visited.has(dependency.href)) pending.push(dependency);
    }
  }

  return modules;
}
