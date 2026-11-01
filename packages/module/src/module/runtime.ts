import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { tsImport } from "tsx/esm/api";
import type { ModuleNamespace } from "../types.js";
import { appendDiagnostic, createAdapterError, isAdapterError } from "../shared/errors.js";
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

  async function prepareAndExecute(): Promise<ModuleNamespace> {
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
  }

  let namespace: ModuleNamespace | undefined;
  let executionError: unknown;
  let cleanupError: unknown;
  try {
    namespace = await prepareAndExecute();
  } catch (error) {
    executionError = error;
  } finally {
    try {
      await rm(runtimeDirectory, { recursive: true, force: true });
    } catch (error) {
      cleanupError = error;
    }
  }

  if (cleanupError !== undefined) {
    const diagnostic = {
      code: "CLEANUP_FAILED" as const,
      message: "Failed to clean up module runtime",
      cause: cleanupError,
    };
    if (isAdapterError(executionError)) {
      throw appendDiagnostic(executionError, diagnostic);
    }
    if (executionError !== undefined) {
      throw appendDiagnostic(
        createAdapterError("LOAD_FAILED", "Failed to execute module", {
          cause: executionError,
          file: entry.href,
        }),
        diagnostic,
      );
    }
    throw createAdapterError("CLEANUP_FAILED", diagnostic.message, {
      cause: cleanupError,
    });
  }

  if (executionError !== undefined) throw executionError;
  if (!namespace) throw new Error("Module execution did not return a namespace");
  return namespace;
}
