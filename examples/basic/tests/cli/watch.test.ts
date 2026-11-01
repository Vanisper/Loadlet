import { expect, it, vi } from "vite-plus/test";
import { runConfigWatch } from "../../src/cli/watch.js";
import type { WatchLogEntry } from "../../src/cli/logger.js";
import { fileUrl, withExampleDirectory, writeText } from "../../src/shared/files.js";

it("常驻配置监听输出快照、异常、恢复与关闭日志", async () => {
  await withExampleDirectory(async (directory) => {
    const file = fileUrl(directory, "config.yaml");
    await writeText(file, "title: first\n");
    const controller = new AbortController();
    const entries: WatchLogEntry[] = [];

    const watching = runConfigWatch({
      file,
      signal: controller.signal,
      log: (entry) => entries.push(entry),
    });
    const waitForEvent = async (event: WatchLogEntry["event"], message: string) => {
      await vi.waitFor(() => {
        expect(
          entries.some((entry) => entry.event === event && entry.message.includes(message)),
        ).toBe(true);
      });
    };

    await waitForEvent("snapshot", '已发布 v1 attempt=1 title="first"');
    await writeText(file, "title: second\n");
    await waitForEvent("snapshot", '已发布 v2 attempt=2 title="second"');

    await writeText(file, "title: [invalid\n");
    await waitForEvent("diagnostic", "当前结果保留 v2 attempt=3 code=PROCESS_FAILED");

    await writeText(file, "title: recovered\n");
    await waitForEvent("snapshot", '已发布 v3 attempt=4 title="recovered"');

    controller.abort();
    const result = await watching;

    expect(result.exitCode).toBe(0);
    expect(result.closeDiagnostics).toEqual([]);
    expect(entries.at(-1)).toMatchObject({ event: "close", message: "会话已关闭 diagnostics=0" });
  });
});

it("初始配置失败时输出诊断并以失败退出", async () => {
  await withExampleDirectory(async (directory) => {
    const file = fileUrl(directory, "config.yaml");
    await writeText(file, "title: [invalid\n");
    const entries: WatchLogEntry[] = [];

    const result = await runConfigWatch({
      file,
      signal: new AbortController().signal,
      log: (entry) => entries.push(entry),
    });

    expect(result.exitCode).toBe(1);
    expect(
      entries.some(
        (entry) => entry.event === "diagnostic" && entry.message.includes("PROCESS_FAILED"),
      ),
    ).toBe(true);
  });
});
