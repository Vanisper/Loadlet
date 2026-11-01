import { moduleLoader } from "@loadlet/module";
import { textLoader } from "@loadlet/node";
import type { ProcessedLoadRequest } from "loadlet";
import { parseModuleConfig } from "./parsers.js";
import type { BasicConfig } from "./types.js";
import type { WatchFormat } from "./formats.js";

export type WatchConfigRequest = ProcessedLoadRequest<URL, unknown, BasicConfig>;

/** 创建可同时用于 CLI 与测试的加载请求 */
export function createWatchConfigRequest(format: WatchFormat, source: URL): WatchConfigRequest {
  if (format.kind === "module") {
    return {
      source,
      loader: moduleLoader(),
      process: parseModuleConfig,
    };
  }

  return {
    source,
    loader: textLoader(),
    process: format.parse,
  };
}
