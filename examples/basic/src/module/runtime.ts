import type { DiagnosticCode } from "loadlet";
import { open } from "loadlet";
import { moduleLoader } from "@loadlet/module";
import { fileWatcher } from "@loadlet/node";
import { fileUrl, withExampleDirectory, writeText } from "../shared/files.js";
import { waitForSnapshot } from "../shared/session.js";

export interface ModuleExampleResult {
  readonly entry: string;
  readonly dependency: string;
  readonly titles: readonly string[];
  readonly versions: readonly number[];
  readonly diagnostics: readonly DiagnosticCode[];
  readonly dependencies: readonly string[];
}

/** 验证 TS 入口、JS 本地依赖与失败恢复 */
export async function runModuleExample(): Promise<ModuleExampleResult> {
  return withExampleDirectory(async (directory) => {
    const entry = fileUrl(directory, "entry.ts");
    const dependency = fileUrl(directory, "value.js");
    await writeText(dependency, 'export const title = "JS dependency";\n');
    await writeText(entry, "import { title } from './value.js';\n\nexport { title };\n");

    const titles: string[] = [];
    const versions: number[] = [];
    const diagnostics: DiagnosticCode[] = [];
    const session = await open(
      {
        source: entry,
        loader: moduleLoader(),
        process: (namespace) => {
          if (typeof namespace.title !== "string") {
            throw new Error("Module must export a string title");
          }
          return { title: namespace.title };
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

    await writeText(dependency, 'export const title = "JS updated";\n');
    await waitForSnapshot(session, (snapshot) => snapshot.value.title === "JS updated");

    await writeText(dependency, "export const title =");
    await waitForSnapshot(
      session,
      (snapshot) => snapshot.value.title === "JS updated" && diagnostics.length === 1,
    );

    await writeText(dependency, 'export const title = "JS recovered";\n');
    await waitForSnapshot(session, (snapshot) => snapshot.value.title === "JS recovered");

    const result: ModuleExampleResult = {
      entry: entry.href,
      dependency: dependency.href,
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
