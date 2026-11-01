import type { Loader } from "loadlet";
import type { ModuleNamespace } from "../types.js";
import { createAdapterError } from "../shared/errors.js";
import { normalizeModuleUrl } from "../shared/file-url.js";
import { collectLocalImportGraph } from "./import-graph.js";
import { executeModuleGraph } from "./runtime.js";

export function moduleLoader(): Loader<URL, ModuleNamespace> {
  return {
    name: "@loadlet/module:node",
    load: async (source, context) => {
      const entry = normalizeModuleUrl(source);
      const modules = await collectLocalImportGraph(source, context);
      try {
        return await executeModuleGraph(modules, source);
      } catch (error) {
        throw createAdapterError("LOAD_FAILED", "Failed to execute module", {
          cause: error,
          file: entry,
        });
      }
    },
  };
}
