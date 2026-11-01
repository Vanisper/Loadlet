import { runContentExample, type ContentExampleResult } from "./content.js";

/** 验证 UTF-8 文本的加载与重载 */
export function runTextExample(): Promise<ContentExampleResult> {
  return runContentExample({
    fileName: "title.txt",
    initial: "Hello",
    changed: "Hello, Loadlet",
    changedTitle: "Hello, Loadlet",
    invalid: "   ",
    recovered: "Recovered",
    recoveredTitle: "Recovered",
    parse: (text) => ({ title: text.trim() }),
  });
}
