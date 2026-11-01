import { runContentExample, type ContentExampleResult } from "./content.js";

/** 验证 JSON 文本解析与重载 */
export function runJsonExample(): Promise<ContentExampleResult> {
  return runContentExample({
    fileName: "title.json",
    initial: '{"title":"JSON"}',
    changed: '{"title":"JSON updated"}',
    changedTitle: "JSON updated",
    invalid: '{"title":',
    recovered: '{"title":"JSON recovered"}',
    recoveredTitle: "JSON recovered",
    parse: (text) => JSON.parse(text) as { title?: unknown },
  });
}
