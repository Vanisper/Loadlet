import type { EvaluationContext, Snapshot } from "loadlet";
import { fileWatcher, readText, textLoader } from "@loadlet/node";
import { load, open } from "loadlet";

declare const source: URL;
declare const context: EvaluationContext;

const once: Promise<Snapshot<string>> = load({
  source,
  loader: textLoader(),
});
const additional: Promise<string> = readText(source, context);
const session = open(
  {
    source,
    loader: textLoader(),
  },
  {
    watcher: fileWatcher(),
  },
);
void [once, additional, session];

// @ts-expect-error 跟踪读取不能省略本轮上下文
void readText(source);

// @ts-expect-error 读取接口要求显式绝对 URL
void readText("./settings.txt", context);
