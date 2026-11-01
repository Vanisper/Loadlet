import { expect, it, vi } from "vite-plus/test";
import { fileWatcher, readText, textLoader } from "@loadlet/node";
import { open } from "loadlet";
import { fileUrl, writeText, withTempDirectory } from "./common/temp.js";

it("fileWatcher 支持修改入口和附加文本后重载", async () => {
  vi.setConfig({ testTimeout: 10_000 });
  await withTempDirectory(async (directory) => {
    const source = fileUrl(directory, "main.txt");
    const extra = fileUrl(directory, "extra.txt");
    await writeText(source, "first");
    await writeText(extra, "one");

    const session = await open(
      {
        source,
        loader: textLoader(),
        process: async (value, context) => `${value}:${await readText(extra, context)}`,
      },
      { watcher: fileWatcher() },
    );

    expect(session.current.value).toBe("first:one");
    await writeText(extra, "two");
    await vi.waitFor(() => expect(session.current.value).toBe("first:two"));
    await writeText(source, "second");
    await vi.waitFor(() => expect(session.current.value).toBe("second:two"));

    const result = await session.close();
    expect(result.diagnostics).toEqual([]);
  });
});

it("fileWatcher 支持缺失附加文件创建后恢复", async () => {
  vi.setConfig({ testTimeout: 10_000 });
  await withTempDirectory(async (directory) => {
    const source = fileUrl(directory, "main.txt");
    const extra = fileUrl(directory, "missing.txt");
    await writeText(source, "main");

    const session = await open(
      {
        source,
        loader: textLoader(),
        process: async (value, context) => {
          try {
            return `${value}:${await readText(extra, context)}`;
          } catch (error) {
            if (!(error instanceof Error) || error.name !== "LoadletError") throw error;
            return `${value}:missing`;
          }
        },
      },
      { watcher: fileWatcher() },
    );

    expect(session.current.value).toBe("main:missing");
    expect(session.current.dependencies).toEqual([source.href, extra.href]);
    await writeText(extra, "created");
    await vi.waitFor(() => expect(session.current.value).toBe("main:created"));

    await session.close();
  });
});
