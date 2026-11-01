const timeFormatter = new Intl.DateTimeFormat("zh-CN", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  fractionalSecondDigits: 3,
  hour12: false,
  timeZone: "Asia/Shanghai",
});

export interface WatchLogEntry {
  readonly time: Date;
  readonly level: "info" | "error";
  readonly event: "startup" | "config" | "hint" | "snapshot" | "diagnostic" | "close";
  readonly message: string;
  readonly detail?: string;
}

export type WatchLogger = (entry: WatchLogEntry) => void;

function formatCause(cause: unknown): string | undefined {
  if (cause instanceof Error) return `${cause.name}: ${cause.message}`;
  if (cause === undefined) return undefined;
  if (typeof cause === "string") return cause;
  return JSON.stringify(cause, undefined, 2);
}

export function diagnosticDetail(cause: unknown): string | undefined {
  const detail = formatCause(cause);
  return detail?.trim() === "" ? undefined : detail;
}

export function formatWatchLog(entry: WatchLogEntry): string {
  const time = timeFormatter.format(entry.time);
  const lines = [`${time} ${entry.event.padEnd(10)} ${entry.message}`];
  if (entry.detail) lines.push(entry.detail.replace(/^/gm, " ".repeat(24)));
  return lines.join("\n");
}

export function createConsoleLogger(): WatchLogger {
  return (entry) => {
    const text = formatWatchLog(entry);
    if (entry.level === "error") console.error(text);
    else console.info(text);
  };
}
