import { parseIniConfig, parseJsonConfig, parseTextConfig, parseYamlConfig } from "./parsers.js";
import {
  iniTemplate,
  jsTemplate,
  jsonTemplate,
  textTemplate,
  tsTemplate,
  yamlTemplate,
} from "./templates.js";
import type { BasicConfig, WatchFormatId } from "./types.js";

export interface WatchInputFormat {
  readonly id: WatchFormatId;
  readonly kind: "text";
  readonly extensions: readonly string[];
  readonly defaultText: string;
  readonly parse: (value: unknown) => BasicConfig;
}

export interface WatchModuleFormat {
  readonly id: WatchFormatId;
  readonly kind: "module";
  readonly extensions: readonly string[];
  readonly defaultText: string;
}

export type WatchFormat = WatchInputFormat | WatchModuleFormat;

export const watchFormats: Readonly<Record<WatchFormatId, WatchFormat>> = {
  yaml: {
    id: "yaml",
    kind: "text",
    extensions: [".yaml", ".yml"],
    defaultText: yamlTemplate,
    parse: parseYamlConfig,
  },
  json: {
    id: "json",
    kind: "text",
    extensions: [".json"],
    defaultText: jsonTemplate,
    parse: parseJsonConfig,
  },
  ini: {
    id: "ini",
    kind: "text",
    extensions: [".ini"],
    defaultText: iniTemplate,
    parse: parseIniConfig,
  },
  text: {
    id: "text",
    kind: "text",
    extensions: [".txt", ".text"],
    defaultText: textTemplate,
    parse: parseTextConfig,
  },
  ts: {
    id: "ts",
    kind: "module",
    extensions: [".ts", ".mts"],
    defaultText: tsTemplate,
  },
  js: {
    id: "js",
    kind: "module",
    extensions: [".js", ".mjs"],
    defaultText: jsTemplate,
  },
};

export const watchFormatIds = Object.freeze(Object.keys(watchFormats)) as readonly WatchFormatId[];

/** 根据格式 ID 或文件扩展名确定输入格式 */
export function resolveWatchFormat(input: {
  readonly id?: string;
  readonly extension?: string;
}): WatchFormat {
  if (input.id) {
    const format = watchFormats[input.id as WatchFormatId];
    if (!Object.hasOwn(watchFormats, input.id)) throw new Error(`Unsupported format: ${input.id}`);
    return format;
  }

  if (input.extension) {
    const extension = input.extension.toLowerCase();
    for (const format of Object.values(watchFormats)) {
      if (format.extensions.includes(extension)) return format;
    }
    throw new Error(`Cannot infer format from extension: ${input.extension}`);
  }

  return watchFormats.yaml;
}
