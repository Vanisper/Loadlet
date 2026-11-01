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

test("成功依赖收缩后退订不再使用的目标", async () => {
  let notify: ((event: FileChange) => void) | undefined;
  let shouldTrackExtra = true;
  let loadCount = 0;
  const removed: string[][] = [];

  const watcher: Watcher = {
    connect(listener) {
      notify = listener;
      return {
        add: async () => {},
        remove: async (files) => {
          removed.push([...files]);
        },
        close: async () => {},
      };
    },
  };

  const session = await open(
    {
      source: mainFile,
      loader: createTestLoader(() => {
        loadCount += 1;
        return `value-${loadCount}`;
      }),
      process: async (value, context) => {
        if (shouldTrackExtra) await context.track(extraFile);
        return { value, hasExtra: shouldTrackExtra };
      },
    },
    { watcher },
  );

  expect(session.current.dependencies).toEqual([extraFile.href, mainFile.href]);

  shouldTrackExtra = false;
  notify?.({ type: "change", files: [mainFile.href] });
  await vi.waitFor(() =>
    expect(session.current).toMatchObject({
      value: { value: "value-2", hasExtra: false },
      dependencies: [mainFile.href],
    }),
  );
  expect(removed).toEqual([[extraFile.href]]);

  notify?.({ type: "change", files: [extraFile.href] });
  await new Promise((resolve) => setImmediate(resolve));
  expect(loadCount).toBe(2);

  await session.close();
});

test("登记依赖失败时终止会话并释放连接", async () => {
  const close = vi.fn(async () => {});
  const watcher: Watcher = {
    connect() {
      return {
        add: async () => {
          throw new Error("watch limit");
        },
        remove: async () => {},
        close,
      };
    },
  };

  await expect(
    open({ source: mainFile, loader: createTestLoader(() => "value") }, { watcher }),
  ).rejects.toMatchObject({
    diagnostics: [{ code: "WATCH_FAILED", file: mainFile.href, attempt: 1 }],
  });
  expect(close).toHaveBeenCalledTimes(1);
});

test("退订依赖失败时保留快照并终止会话", async () => {
  let notify: ((event: FileChange) => void) | undefined;
  let shouldTrackExtra = true;
  let failRemove = false;

  const watcher: Watcher = {
    connect(listener) {
      notify = listener;
      return {
        add: async () => {},
        remove: async () => {
          if (failRemove) throw new Error("remove failed");
        },
        close: async () => {},
      };
    },
  };

  const session = await open(
    {
      source: mainFile,
      loader: createTestLoader(() => "value"),
      process: async (value, context) => {
        if (shouldTrackExtra) await context.track(extraFile);
        return { value, hasExtra: shouldTrackExtra };
      },
    },
    { watcher },
  );

  const events: string[] = [];
  session.subscribe((event) => {
    events.push(event.type === "snapshot" ? "snapshot" : event.diagnostic.code);
  });

  shouldTrackExtra = false;
  failRemove = true;
  notify?.({ type: "change", files: [mainFile.href] });
  await vi.waitFor(() => expect(events).toEqual(["snapshot", "WATCH_FAILED"]));
  await vi.waitFor(() => expect(session.state).toBe("closed"));
  expect(session.current.value).toEqual({ value: "value", hasExtra: true });
});
