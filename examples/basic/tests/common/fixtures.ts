import { readFile } from "node:fs/promises";
import { fileUrl, withExampleDirectory, writeText } from "./files.js";
import { watchFormats, type WatchFormatId } from "../../src/index.js";

export type FixtureStage = "initial" | "changed" | "invalid" | "recovered";

export async function readConfigFixture(
  format: WatchFormatId,
  stage: FixtureStage | "entry",
): Promise<string> {
  return readFile(new URL(`../fixtures/${format}/${stage}.txt`, import.meta.url), "utf8");
}

export async function withConfigFixture<T>(
  id: WatchFormatId,
  run: (fixture: {
    readonly source: URL;
    readonly dependency: URL;
    readonly update: (stage: FixtureStage) => Promise<void>;
  }) => Promise<T>,
): Promise<T> {
  return withExampleDirectory(async (directory) => {
    const format = watchFormats[id];
    const source = fileUrl(directory, `config${format.extensions[0]}`);
    const dependency =
      format.kind === "module" ? fileUrl(directory, `data${format.extensions[0]}`) : source;
    const update = async (stage: FixtureStage) =>
      writeText(dependency, await readConfigFixture(id, stage));
    if (format.kind === "module") await writeText(source, await readConfigFixture(id, "entry"));
    await update("initial");
    return run({ source, dependency, update });
  });
}
