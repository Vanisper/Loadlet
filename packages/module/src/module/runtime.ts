import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { tsImport } from "tsx/esm/api";
import type { ModuleNamespace } from "../types.js";
import { createAdapterError } from "../shared/errors.js";
import type { ModuleSource } from "./import-graph.js";

function modulePath(module: ModuleSource): string {
  return fileURLToPath(module.url);
}

function commonModuleDirectory(modules: readonly ModuleSource[]): string {
  const directories = modules.map((module) => dirname(modulePath(module)));
  const parts = directories.map((directory) => resolve(directory).split(sep));
  const common = parts[0] ?? [];
  for (const directory of parts.slice(1)) {
    for (let index = 0; index < common.length; index += 1) {
      if (common[index] !== directory[index]) {
        common.length = index;
        break;
      }
    }
  }
  return common.join(sep) || sep;
}

/** 在隔离模块图中执行本轮本地依赖，避免复用上一轮 ESM 缓存 */
export async function executeModuleGraph(
  modules: readonly ModuleSource[],
  entry: URL,
): Promise<ModuleNamespace> {
  const root = commonModuleDirectory(modules);
  const runtimeDirectory = await mkdtemp(join(tmpdir(), "loadlet-module-"));
  const runtimeRoot = join(runtimeDirectory, "modules");
  const runtimeEntries = new Map<string, URL>();

  try {
    await writeFile(join(runtimeDirectory, "package.json"), '{"type":"module"}\n', "utf8");
    for (const module of modules) {
      const relativePath = relative(root, modulePath(module));
      if (relativePath.startsWith("..")) {
        throw createAdapterError(
          "LOAD_FAILED",
          "Module graph cannot be contained in a shared root",
          {
            file: module.url.href,
          },
        );
      }

      const runtimePath = join(runtimeRoot, relativePath);
      await mkdir(dirname(runtimePath), { recursive: true });
      await writeFile(runtimePath, module.code, "utf8");
      runtimeEntries.set(module.url.href, pathToFileURL(runtimePath));
    }

    const runtimeEntry = runtimeEntries.get(entry.href);
    if (!runtimeEntry) {
      throw createAdapterError("LOAD_FAILED", "Module entry is not in the local module graph", {
        file: entry.href,
      });
    }

    return (await tsImport(runtimeEntry.href, { parentURL: entry.href })) as ModuleNamespace;
  } finally {
    await rm(runtimeDirectory, { recursive: true, force: true });
  }
}
