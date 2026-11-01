import type { Diagnostic, Snapshot } from "loadlet";

/** 配置保留原有字段，title 用于演示业务校验 */
export interface BasicConfig {
  readonly title: string;
  readonly [name: string]: unknown;
}

export type WatchFormatId = "yaml" | "json" | "ini" | "text" | "ts" | "js";

/** 监听流程输出的数据，终端和测试共用 */
export type ConfigWatchLogEntry = { readonly time: Date } & (
  | { readonly event: "startup"; readonly file: URL; readonly format: WatchFormatId }
  | { readonly event: "snapshot"; readonly snapshot: Snapshot<BasicConfig> }
  | {
      readonly event: "diagnostic";
      readonly diagnostic: Diagnostic;
      readonly current?: Snapshot<BasicConfig>;
    }
  | { readonly event: "close"; readonly diagnostics: readonly Diagnostic[] }
);

/** 同步观察监听事件，不应抛出异常 */
export type ConfigWatchLogger = (entry: ConfigWatchLogEntry) => void;
