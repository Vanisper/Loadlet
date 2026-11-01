import { expect, it, vi } from "vite-plus/test";
import {
  runConfigWatch,
  watchFormatIds,
  watchFormats,
  type ConfigWatchLogEntry,
} from "../../src/index.js";
import { withConfigFixture } from "../common/fixtures.js";

it.each(watchFormatIds)("%s 监听复用配置请求，验证更新、失败保留、恢复和关闭", async (id) => {
  await withConfigFixture(id, async ({ source, dependency, update }) => {
    const controller = new AbortController();
    const entries: ConfigWatchLogEntry[] = [];
    const watching = runConfigWatch({
      file: source,
      format: watchFormats[id],
      signal: controller.signal,
      log: (entry) => {
        entries.push(entry);
      },
    });
    const snapshots = () => entries.filter((entry) => entry.event === "snapshot");
    const diagnostics = () => entries.filter((entry) => entry.event === "diagnostic");
    const waitForTitle = async (title: string) => {
      await vi.waitFor(() => expect(snapshots().at(-1)?.snapshot.value.title).toBe(title));
    };

    try {
      await waitForTitle("initial");
      const initial = snapshots().at(-1)!.snapshot;
      expect(initial.dependencies).toEqual([...new Set([source.href, dependency.href])].sort());
      await update("changed");
      await waitForTitle("changed");
      const current = snapshots().at(-1)!.snapshot;

      await update("invalid");
      await vi.waitFor(() => expect(diagnostics().length).toBeGreaterThan(0));
      expect(diagnostics().at(-1)?.diagnostic.code).toBe(
        watchFormats[id].kind === "module" ? "LOAD_FAILED" : "PROCESS_FAILED",
      );
      expect(diagnostics().at(-1)?.current).toBe(current);
      expect(snapshots().at(-1)?.snapshot).toBe(current);

      await update("recovered");
      await waitForTitle("recovered");
      expect(snapshots().at(-1)?.snapshot.version).toBe(current.version + 1);
      expect(snapshots().at(-1)?.snapshot.attempt).toBeGreaterThan(current.attempt + 1);
      expect(snapshots().at(-1)?.snapshot.value).toEqual({ ...initial.value, title: "recovered" });
    } finally {
      controller.abort();
      const result = await watching;
      expect(result).toEqual({ exitCode: 0, closeDiagnostics: [] });
    }
    expect(entries.at(-1)).toMatchObject({ event: "close", diagnostics: [] });
    expect(diagnostics().some((entry) => entry.diagnostic.code === "ABORTED")).toBe(false);
  });
});

it("初始配置无效时输出原始诊断并返回失败", async () => {
  await withConfigFixture("yaml", async ({ source, update }) => {
    await update("invalid");
    const entries: ConfigWatchLogEntry[] = [];
    const result = await runConfigWatch({
      file: source,
      format: watchFormats.yaml,
      signal: new AbortController().signal,
      log: (entry) => {
        entries.push(entry);
      },
    });
    expect(result.exitCode).toBe(1);
    expect(entries.at(-1)).toMatchObject({
      event: "diagnostic",
      diagnostic: { code: "PROCESS_FAILED", cause: expect.any(Error) },
    });
  });
});
