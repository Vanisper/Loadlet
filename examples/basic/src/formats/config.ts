import { parse } from "yaml";

export interface BasicConfig {
  readonly title: string;
}

export const defaultConfigText = `# 修改 title 后保存，终端会输出新的 snapshot
title: Loadlet

# title 为空或 YAML 无效时，可观察失败保留与恢复
`;

/** 解析并校验基础示例配置 */
export function parseBasicConfig(text: string): BasicConfig {
  const value = parse(text) as unknown;
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Config must be a mapping");
  }

  const title = (value as { readonly title?: unknown }).title;
  if (typeof title !== "string" || title.length === 0) {
    throw new Error("Config title must be a non-empty string");
  }

  return { title };
}
