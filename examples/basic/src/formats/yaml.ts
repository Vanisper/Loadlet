import { parse } from "yaml";
import { runContentExample, type ContentExampleResult } from "./content.js";

/** 验证 YAML 文本解析与重载 */
export function runYamlExample(): Promise<ContentExampleResult> {
  return runContentExample({
    fileName: "title.yaml",
    initial: "title: YAML\n",
    changed: "title: YAML updated\n",
    changedTitle: "YAML updated",
    invalid: "title: [invalid\n",
    recovered: "title: YAML recovered\n",
    recoveredTitle: "YAML recovered",
    parse: (text) => parse(text) as { title?: unknown },
  });
}
