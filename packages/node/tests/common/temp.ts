import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

export async function withTempDirectory<T>(run: (directory: URL) => Promise<T>): Promise<T> {
  const path = await mkdtemp(join(tmpdir(), "loadlet-node-"));
  try {
    return await run(pathToFileURL(path));
  } finally {
    await rm(path, { recursive: true, force: true });
  }
}

export function fileUrl(directory: URL, name: string): URL {
  return new URL(name, new URL(`${directory.href}/`));
}

export async function writeText(file: URL, value: string): Promise<void> {
  await writeFile(file, value, "utf8");
}
