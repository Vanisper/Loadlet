import { parse as parseIni } from "ini";
import { parse as parseYaml } from "yaml";

import type { BasicConfig } from "./types.js";

function parseRecord(value: unknown): BasicConfig {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Config must be a mapping");
  }

  const title = (value as { readonly title?: unknown }).title;
  if (typeof title !== "string" || title.trim().length === 0) {
    throw new Error("Config title must be a non-empty string");
  }

  return value as BasicConfig;
}

/** 解析 JSON 配置 */
export function parseJsonConfig(value: unknown): BasicConfig {
  if (typeof value !== "string") throw new Error("Config must be JSON text");
  return parseRecord(JSON.parse(value));
}

/** 解析 INI 配置 */
export function parseIniConfig(value: unknown): BasicConfig {
  if (typeof value !== "string") throw new Error("Config must be INI text");
  return parseRecord(parseIni(value));
}

/** 解析 text 配置，完整文本去除首尾空白后作为 title */
export function parseTextConfig(value: unknown): BasicConfig {
  if (typeof value !== "string") throw new Error("Config must be text");
  const title = value.trim();
  if (title.length === 0) throw new Error("Config title must be a non-empty string");
  return { title };
}

/** 解析 YAML 配置 */
export function parseYamlConfig(value: unknown): BasicConfig {
  if (typeof value !== "string") throw new Error("Config must be YAML text");
  return parseRecord(parseYaml(value));
}

/** 从模块命名空间中读取 config 导出 */
export function parseModuleConfig(value: unknown): BasicConfig {
  if (typeof value !== "object" || value === null) {
    throw new Error("Config module must export a config object");
  }
  return parseRecord((value as { readonly config?: unknown }).config);
}
