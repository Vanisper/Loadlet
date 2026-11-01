import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

/** 创建随示例隔离的临时目录，结束后删除 */
export async function withExampleDirectory<T>(run: (directory: URL) => Promise<T>): Promise<T> {
  const path = await mkdtemp(join(tmpdir(), "loadlet-example-"));
  try {
    return await run(pathToFileURL(path));
  } finally {
    await rm(path, { recursive: true, force: true });
  }
}

/** 在目录内创建绝对文件 URL，固定 base 避免 testNumber 继承 */
export function fileUrl(directory: URL, name: string): URL {
  return new URL(name, new URL(`${directory.href}/`));
}

/** 写入 UTF-8 文本 */
export async function writeText(file: URL, value: string): Promise<void> {
  await writeFile(file, value, "utf8");
}

/** 确保演示配置存在，已存在时保留用户内容 */
export async function ensureTextFile(file: URL, value: string): Promise<void> {
  await mkdir(new URL(".", file), { recursive: true });
  await writeFile(file, value, { encoding: "utf8", flag: "wx" }).catch((error: unknown) => {
    if (!(error instanceof Error) || (error as NodeJS.ErrnoException).code !== "EEXIST") {
      throw error;
    }
  });
}
