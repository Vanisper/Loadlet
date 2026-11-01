import type { DiagnosticCode } from "loadlet";
import { open } from "loadlet";
import { fileWatcher, textLoader } from "@loadlet/node";
import { fileUrl, withExampleDirectory, writeText } from "../shared/files.js";
import { waitForSnapshot } from "../shared/session.js";

export interface ContentExampleResult {
  readonly source: string;
  readonly titles: readonly string[];
  readonly versions: readonly number[];
  readonly diagnostics: readonly DiagnosticCode[];
  readonly dependencies: readonly string[];
}

interface ContentExampleOptions {
  readonly fileName: string;
  readonly initial: string;
  readonly changed: string;
  readonly changedTitle: string;
  readonly invalid: string;
  readonly recovered: string;
  readonly recoveredTitle: string;
  readonly parse: (text: string) => { readonly title?: unknown };
}

/** 运行一次文本格式的基础加载、失败保留与恢复流程 */
export async function runContentExample(
  options: ContentExampleOptions,
): Promise<ContentExampleResult> {
  return withExampleDirectory(async (directory) => {
    const source = fileUrl(directory, options.fileName);
    await writeText(source, options.initial);

    const titles: string[] = [];
    const versions: number[] = [];
    const diagnostics: DiagnosticCode[] = [];
    const session = await open(
      {
        source,
        loader: textLoader(),
        process: (text) => {
          const value = options.parse(text);
          if (typeof value.title !== "string" || value.title.length === 0) {
            throw new Error("Content must provide a non-empty title");
          }
          return { title: value.title };
        },
      },
      { watcher: fileWatcher() },
    );

    const unsubscribe = session.subscribe((event) => {
      if (event.type === "snapshot") {
        titles.push(event.snapshot.value.title);
        versions.push(event.snapshot.version);
      } else {
        diagnostics.push(event.diagnostic.code);
      }
    });

    await writeText(source, options.changed);
    await waitForSnapshot(session, (snapshot) => snapshot.value.title === options.changedTitle);

    await writeText(source, options.invalid);
    await waitForSnapshot(
      session,
      (snapshot) => snapshot.value.title === options.changedTitle && diagnostics.length === 1,
    );

    await writeText(source, options.recovered);
    await waitForSnapshot(session, (snapshot) => snapshot.value.title === options.recoveredTitle);

    const result: ContentExampleResult = {
      source: source.href,
      titles: [...titles],
      versions: [...versions],
      diagnostics: [...diagnostics],
      dependencies: [...session.current.dependencies],
    };
    unsubscribe();
    await session.close();
    return result;
  });
}
