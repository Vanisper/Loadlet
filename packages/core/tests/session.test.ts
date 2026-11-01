import { expect, test, vi } from "vite-plus/test";
import type { FileChange, WatchConnection, Watcher } from "loadlet";
import { open } from "loadlet";
import { createTestLoader, extraFile, mainFile } from "./common/loader.js";

test("open 跟踪处理阶段依赖并保留失败快照", async () => {
  let text = "first";
  let extraText = "default";
  let shouldFail = false;
  let notify: ((event: FileChange) => void) | undefined;

  const watcher: Watcher = {
    connect(listener) {
      notify = listener;
      return {
        add: async () => {},
        remove: async () => {},
        close: async () => {},
      };
    },
  };

  const session = await open(
    {
      source: mainFile,
      loader: createTestLoader(() => text),
      process: async (value, context) => {
        await context.track(extraFile);
        if (shouldFail) throw new Error("process failed");
        return { title: value, extra: extraText };
      },
    },
    { watcher },
  );

  expect(session.current.value).toEqual({ title: "first", extra: "default" });
  expect(session.current.dependencies).toEqual([extraFile.href, mainFile.href]);

  const events: string[] = [];
  session.subscribe((event) => {
    events.push(event.type === "snapshot" ? `v${event.snapshot.version}` : event.diagnostic.code);
  });
  expect(events).toEqual(["v1"]);

  shouldFail = true;
  notify?.({ type: "change", files: [mainFile.href] });
  await vi.waitFor(() => expect(events).toEqual(["v1", "PROCESS_FAILED"]));
  expect(session.current.value).toEqual({ title: "first", extra: "default" });
  expect(session.current.version).toBe(1);

  shouldFail = false;
  text = "second";
  extraText = "updated";
  notify?.({ type: "change", files: [extraFile.href] });
  await vi.waitFor(() => expect(events).toEqual(["v1", "PROCESS_FAILED", "v2"]));
  expect(session.current.value).toEqual({ title: "second", extra: "updated" });
  expect(session.current.version).toBe(2);

  await session.close();
  expect(session.state).toBe("closed");
});

test("close 拒绝后续 reload 并释放监听连接", async () => {
  const close = vi.fn(async () => {});
  const watcher: Watcher = {
    connect() {
      const connection: WatchConnection = {
        add: async () => {},
        remove: async () => {},
        close,
      };
      return connection;
    },
  };
  const session = await open(
    { source: mainFile, loader: createTestLoader(() => "value") },
    { watcher },
  );

  await session.close();
  expect(close).toHaveBeenCalledTimes(1);
  expect(session.state).toBe("closed");
  await expect(session.reload()).rejects.toMatchObject({
    diagnostics: [{ code: "SESSION_CLOSED" }],
  });
});
