import { once } from "node:events";
import { fileURLToPath, pathToFileURL } from "node:url";
import { watch, type FSWatcher } from "chokidar";
import type { WatchConnection, Watcher } from "loadlet";
import { createAdapterError } from "../shared/errors.js";
import { normalizeWatchedFile } from "../shared/file-url.js";

export type FileWatchListener = Parameters<Watcher["connect"]>[0];

function createFileWatcher(path: string, notify: FileWatchListener): FSWatcher {
  const fileWatcher = watch(path, {
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 40, pollInterval: 10 },
  });

  fileWatcher.on("all", (event, changedPath) => {
    if (event !== "add" && event !== "change" && event !== "unlink") return;
    notify({ type: "change", files: [pathToFileURL(changedPath).href] });
  });
  fileWatcher.on("error", (error) => {
    notify({ type: "error", cause: error });
  });
  return fileWatcher;
}

async function waitForReady(fileWatcher: FSWatcher, path: string): Promise<void> {
  const [, error] = await Promise.race([once(fileWatcher, "ready"), once(fileWatcher, "error")]);
  if (error) {
    throw createAdapterError("WATCH_FAILED", "Failed to start watching file", {
      cause: error,
      file: pathToFileURL(path).href,
    });
  }
}

function createFileConnection(notify: FileWatchListener): WatchConnection {
  const watchers = new Map<string, FSWatcher>();

  return {
    add: async (files) => {
      for (const file of files) {
        const dependency = normalizeWatchedFile(file);
        if (watchers.has(dependency)) continue;

        const path = fileURLToPath(file);
        const fileWatcher = createFileWatcher(path, notify);
        watchers.set(dependency, fileWatcher);
        try {
          await waitForReady(fileWatcher, path);
        } catch (error) {
          watchers.delete(dependency);
          await fileWatcher.close().catch(() => {});
          throw error;
        }
      }
    },
    remove: async (files) => {
      await Promise.all(
        files.map(async (file) => {
          const dependency = normalizeWatchedFile(file);
          const fileWatcher = watchers.get(dependency);
          if (!fileWatcher) return;
          watchers.delete(dependency);
          await fileWatcher.close();
        }),
      );
    },
    close: async () => {
      await Promise.all([...watchers.values()].map((fileWatcher) => fileWatcher.close()));
      watchers.clear();
    },
  };
}

export function fileWatcher(): Watcher {
  return {
    connect: (listener) => createFileConnection(listener),
  };
}
