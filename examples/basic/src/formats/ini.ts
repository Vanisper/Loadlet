import { parse } from "ini";
import { runContentExample, type ContentExampleResult } from "./content.js";

/** 验证 INI 文本解析与重载 */
export function runIniExample(): Promise<ContentExampleResult> {
  return runContentExample({
    fileName: "title.ini",
    initial: "title = INI\n",
    changed: "title = INI updated\n",
    changedTitle: "INI updated",
    invalid: "",
    recovered: "title = INI recovered\n",
    recoveredTitle: "INI recovered",
    parse: (text) => parse(text) as { title?: unknown },
  });
}
