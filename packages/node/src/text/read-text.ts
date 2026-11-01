import { readFile } from "node:fs/promises";
import type { EvaluationContext, Loader } from "loadlet";
import { createAdapterError } from "../shared/errors.js";
import { normalizeFileUrl } from "../shared/file-url.js";

export async function readText(file: URL, context: EvaluationContext): Promise<string> {
  const dependency = normalizeFileUrl(file);
  await context.track(file);
  try {
    return await readFile(file, "utf8");
  } catch (error) {
    throw createAdapterError("LOAD_FAILED", "Failed to read UTF-8 text", {
      cause: error,
      file: dependency,
    });
  }
}

export function textLoader(): Loader<URL, string> {
  return {
    name: "@loadlet/node:text",
    load: (source, context) => readText(source, context),
  };
}
