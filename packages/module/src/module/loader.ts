import { tsImport } from "tsx/esm/api";
import type { Loader } from "loadlet";
import type { ModuleNamespace } from "../types.js";
import { createAdapterError } from "../shared/errors.js";
import { normalizeModuleUrl } from "../shared/file-url.js";
import { trackLocalImportGraph } from "./import-graph.js";

export function moduleLoader(): Loader<URL, ModuleNamespace> {
  return {
    name: "@loadlet/module:node",
    load: async (source, context) => {
      const entry = normalizeModuleUrl(source);
      await trackLocalImportGraph(source, context);
      try {
        return (await tsImport(entry, {
          parentURL: import.meta.url,
        })) as ModuleNamespace;
      } catch (error) {
        throw createAdapterError("LOAD_FAILED", "Failed to execute module", {
          cause: error,
          file: entry,
        });
      }
    },
  };
}
