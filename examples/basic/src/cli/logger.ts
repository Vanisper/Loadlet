import { fileURLToPath } from "node:url";
import { inspect } from "node:util";
import type { ConfigWatchLogEntry, ConfigWatchLogger } from "../config/types.js";

const timeFormatter = new Intl.DateTimeFormat("zh-CN", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  fractionalSecondDigits: 3,
  hour12: false,
  timeZone: "Asia/Shanghai",
});

interface WatchLogFormatOptions {
  readonly colors?: boolean;
}

function paint(text: string, color: string, enabled: boolean): string {
  return enabled ? `\u001b[${color}m${text}\u001b[0m` : text;
}

/** 渲染完整结果与诊断，支持循环引用和 JS 特有值 */
export function formatWatchLog(
  entry: ConfigWatchLogEntry,
  options: WatchLogFormatOptions = {},
): string {
  const colors = options.colors ?? false;
  const time = timeFormatter.format(entry.time);
  const renderValue = (value: unknown) => inspect(value, { depth: null, colors, compact: false });
  const error =
    entry.event === "diagnostic" || (entry.event === "close" && entry.diagnostics.length > 0);
  const event = paint(
    entry.event.padEnd(10),
    error ? "31" : entry.event === "snapshot" ? "32" : "36",
    colors,
  );
  let message: string;
  let detail: string | undefined;

  switch (entry.event) {
    case "startup":
      message = `Loadlet 配置监听 format=${entry.format}`;
      detail = `配置文件：${fileURLToPath(entry.file)}\n修改并保存文件查看结果；Ctrl+C 退出`;
      break;
    case "snapshot":
      message = `已发布 v${entry.snapshot.version} attempt=${entry.snapshot.attempt} dependencies=${entry.snapshot.dependencies.length}`;
      detail = renderValue(entry.snapshot.value);
      break;
    case "diagnostic": {
      const status = entry.current ? `当前结果保留 v${entry.current.version}` : "初始加载失败";
      message = `${status} attempt=${entry.diagnostic.attempt ?? "unknown"} code=${entry.diagnostic.code}`;
      const cause = entry.diagnostic.cause;
      detail = entry.diagnostic.message;
      if (cause instanceof Error) detail += `\n${cause.name}: ${cause.message}`;
      else if (cause !== undefined) detail += `\n${renderValue(cause)}`;
      if (entry.diagnostic.file) detail += `\n文件：${entry.diagnostic.file}`;
      break;
    }
    case "close":
      message = `会话已关闭 diagnostics=${entry.diagnostics.length}`;
      if (entry.diagnostics.length > 0) detail = renderValue(entry.diagnostics);
      break;
  }

  const lines = [`${time} ${event} ${message}`];
  if (detail) lines.push(detail.replace(/^/gm, " ".repeat(24)));
  return lines.join("\n");
}

export function createConsoleLogger(): ConfigWatchLogger {
  return (entry) => {
    const error =
      entry.event === "diagnostic" || (entry.event === "close" && entry.diagnostics.length > 0);
    const stream = error ? process.stderr : process.stdout;
    const forceColor = process.env.FORCE_COLOR;
    const text = formatWatchLog(entry, {
      colors:
        process.env.NO_COLOR === undefined &&
        (forceColor === undefined ? stream.isTTY === true : forceColor !== "0"),
    });
    stream.write(`${text}\n`);
  };
}
