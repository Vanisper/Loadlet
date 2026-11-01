import type { Diagnostic, LoadletError } from "loadlet";
import { open } from "loadlet";
import { fileWatcher, textLoader } from "@loadlet/node";
import { fileURLToPath } from "node:url";
import { parseBasicConfig } from "../formats/config.js";
import type { WatchLogger } from "./logger.js";
import { diagnosticDetail } from "./logger.js";

export interface ConfigWatchOptions {
  readonly file: URL;
  readonly signal: AbortSignal;
  readonly log: WatchLogger;
}

export interface ConfigWatchResult {
  readonly exitCode: number;
  readonly closeDiagnostics: readonly Diagnostic[];
}

function isLoadletError(error: unknown): error is LoadletError {
  return (
    error instanceof Error &&
    error.name === "LoadletError" &&
    Array.isArray((error as LoadletError).diagnostics)
  );
}

function errorDiagnostics(error: unknown): readonly Diagnostic[] {
  return isLoadletError(error) ? error.diagnostics : [];
}

/** 运行常驻配置监听，直到 signal 中止或 watcher 终止 */
export async function runConfigWatch(options: ConfigWatchOptions): Promise<ConfigWatchResult> {
  const { file, signal, log } = options;
  log({
    time: new Date(),
    level: "info",
    event: "startup",
    message: "Loadlet 配置监听已启动",
  });
  log({
    time: new Date(),
    level: "info",
    event: "config",
    message: `配置文件：${fileURLToPath(file)}`,
  });
  log({
    time: new Date(),
    level: "info",
    event: "hint",
    message: "修改并保存配置文件；Ctrl+C 退出",
  });

  let stop!: () => void;
  const stopped = new Promise<void>((resolve) => {
    stop = resolve;
  });
  signal.addEventListener("abort", stop, { once: true });

  let exitCode = 0;
  let session;
  try {
    session = await open(
      {
        source: file,
        loader: textLoader(),
        process: parseBasicConfig,
      },
      { watcher: fileWatcher(), signal },
    );
  } catch (error) {
    const [diagnostic] = errorDiagnostics(error);
    const aborted = signal.aborted && diagnostic?.code === "ABORTED";
    exitCode = aborted ? 0 : 1;
    log({
      time: new Date(),
      level: "error",
      event: "diagnostic",
      message: diagnostic
        ? `初始加载失败 code=${diagnostic.code} attempt=${diagnostic.attempt ?? "unknown"}`
        : `初始加载失败：${error instanceof Error ? error.message : String(error)}`,
      detail: diagnosticDetail(error instanceof Error ? error.cause : error),
    });
    signal.removeEventListener("abort", stop);
    return { exitCode, closeDiagnostics: [] };
  }

  const unsubscribe = session.subscribe((event) => {
    if (event.type === "snapshot") {
      log({
        time: new Date(),
        level: "info",
        event: "snapshot",
        message: `已发布 v${event.snapshot.version} attempt=${event.snapshot.attempt} title=${JSON.stringify(event.snapshot.value.title)}`,
      });
      return;
    }

    if (signal.aborted && event.diagnostic.code === "ABORTED") return;
    if (event.diagnostic.code === "WATCH_FAILED") exitCode = 1;
    log({
      time: new Date(),
      level: "error",
      event: "diagnostic",
      message: `当前结果保留 v${session.current.version} attempt=${event.diagnostic.attempt ?? "unknown"} code=${event.diagnostic.code}`,
      detail: diagnosticDetail(event.diagnostic.cause),
    });
    if (event.diagnostic.code === "WATCH_FAILED") stop();
  });

  await stopped;
  signal.removeEventListener("abort", stop);
  unsubscribe();
  const closeResult = await session.close();
  log({
    time: new Date(),
    level: closeResult.diagnostics.length > 0 ? "error" : "info",
    event: "close",
    message: `会话已关闭 diagnostics=${closeResult.diagnostics.length}`,
  });
  for (const diagnostic of closeResult.diagnostics) {
    log({
      time: new Date(),
      level: "error",
      event: "close",
      message: `清理失败 code=${diagnostic.code}`,
      detail: diagnosticDetail(diagnostic.cause),
    });
  }

  return { exitCode, closeDiagnostics: closeResult.diagnostics };
}
