import { mkdir, writeFile } from "node:fs/promises";

/** 确保演示配置存在，已存在时保留用户内容 */
export async function ensureTextFile(file: URL, value: string): Promise<void> {
  await mkdir(new URL(".", file), { recursive: true });
  await writeFile(file, value, { encoding: "utf8", flag: "wx" }).catch((error: unknown) => {
    if (!(error instanceof Error) || (error as NodeJS.ErrnoException).code !== "EEXIST") {
      throw error;
    }
  });
}
