import type { Diagnostic, LoadletError, Session } from "loadlet";
import { open } from "loadlet";
import { fileWatcher } from "@loadlet/node";
import { createWatchConfigRequest } from "./request.js";
import type { WatchFormat } from "./formats.js";
import type { BasicConfig, ConfigWatchLogger } from "./types.js";

export interface ConfigWatchOptions {
  readonly file: URL;
  readonly format: WatchFormat;
  readonly signal: AbortSignal;
  readonly log: ConfigWatchLogger;
}

export interface ConfigWatchResult {
  readonly exitCode: number;
  readonly closeDiagnostics: readonly Diagnostic[];
}

function errorDiagnostics(error: unknown): readonly Diagnostic[] {
  if (
    error instanceof Error &&
    error.name === "LoadletError" &&
    Array.isArray((error as LoadletError).diagnostics)
  ) {
    return (error as LoadletError).diagnostics;
  }
  return [{ code: "LOAD_FAILED", message: "Failed to open config", cause: error }];
}

/** 运行配置监听，初始失败返回，打开后等待取消或监听故障 */
export async function runConfigWatch(options: ConfigWatchOptions): Promise<ConfigWatchResult> {
  const { file, format, signal, log } = options;
  log({ time: new Date(), event: "startup", file, format: format.id });

  let stop!: () => void;
  const stopped = new Promise<void>((resolve) => {
    stop = resolve;
  });
  signal.addEventListener("abort", stop, { once: true });
  if (signal.aborted) stop();

  let session: Session<BasicConfig>;
  try {
    session = await open(createWatchConfigRequest(format, file), {
      watcher: fileWatcher(),
      signal,
    });
  } catch (error) {
    signal.removeEventListener("abort", stop);
    const diagnostics = errorDiagnostics(error);
    const aborted = signal.aborted && diagnostics[0]?.code === "ABORTED";
    for (const diagnostic of diagnostics) {
      if (!aborted) log({ time: new Date(), event: "diagnostic", diagnostic });
    }
    return {
      exitCode: aborted ? 0 : 1,
      closeDiagnostics: diagnostics.filter((diagnostic) => diagnostic.code === "CLEANUP_FAILED"),
    };
  }

  let exitCode = 0;
  let closeDiagnostics: readonly Diagnostic[] = [];
  let unsubscribe: (() => void) | undefined;
  try {
    if (!signal.aborted)
      unsubscribe = session.subscribe((event) => {
        if (event.type === "snapshot") {
          log({ time: new Date(), event: "snapshot", snapshot: event.snapshot });
          return;
        }
        if (signal.aborted && event.diagnostic.code === "ABORTED") return;
        if (event.diagnostic.code === "WATCH_FAILED") {
          exitCode = 1;
          stop();
        }
        log({
          time: new Date(),
          event: "diagnostic",
          diagnostic: event.diagnostic,
          current: session.current,
        });
      });
    await stopped;
  } finally {
    signal.removeEventListener("abort", stop);
    unsubscribe?.();
    const result = await session.close();
    closeDiagnostics = result.diagnostics;
    log({ time: new Date(), event: "close", diagnostics: result.diagnostics });
  }
  return {
    exitCode: closeDiagnostics.length > 0 ? 1 : exitCode,
    closeDiagnostics,
  };
}
