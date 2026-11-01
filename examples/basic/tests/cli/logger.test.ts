import { expect, it, vi } from "vite-plus/test";
import { createConsoleLogger, formatWatchLog } from "../../src/cli/logger.js";
import type { ConfigWatchLogEntry } from "../../src/index.js";

it("完整渲染结果对象并为事件与结构化值着色", () => {
  const value = { title: "demo", server: { port: 8080 }, items: ["one", "two"] };
  const entry: ConfigWatchLogEntry = {
    time: new Date(0),
    event: "snapshot",
    snapshot: { id: "test", version: 2, attempt: 3, dependencies: ["file:///config.json"], value },
  };
  const plain = formatWatchLog(entry);
  expect(plain).toContain("08:00:00.000 snapshot   已发布 v2 attempt=3 dependencies=1");
  expect(plain).toContain("server: {");
  expect(plain).toContain("port: 8080");
  expect(plain).toContain("'two'");
  expect(plain).not.toContain("\u001b[");
  const colored = formatWatchLog(entry, { colors: true });
  expect(colored).toContain("\u001b[32msnapshot  \u001b[0m");
});

it("诊断呈现错误代码、原因与保留版本", () => {
  const text = formatWatchLog({
    time: new Date(0),
    event: "diagnostic",
    diagnostic: {
      code: "PROCESS_FAILED",
      message: "Invalid config",
      cause: new Error("Missing title"),
    },
    current: {
      id: "test",
      version: 2,
      attempt: 2,
      dependencies: [],
      value: { title: "last valid" },
    },
  });
  expect(text).toContain("当前结果保留 v2 attempt=unknown code=PROCESS_FAILED");
  expect(text).toContain("Error: Missing title");
});

it("JS 配置中的循环引用与 BigInt 不会中断终端输出", () => {
  const value: { title: string; count: bigint; self?: unknown } = { title: "demo", count: 2n };
  value.self = value;
  const text = formatWatchLog({
    time: new Date(0),
    event: "snapshot",
    snapshot: { id: "test", version: 1, attempt: 1, dependencies: [], value },
  });
  expect(text).toContain("2n");
  expect(text).toContain("[Circular");
});

it("任务管道支持 FORCE_COLOR，NO_COLOR 优先关闭颜色", () => {
  const writes: string[] = [];
  const write = vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
    writes.push(String(chunk));
    return true;
  });
  try {
    vi.stubEnv("FORCE_COLOR", "1");
    vi.stubEnv("NO_COLOR", undefined);
    const log = createConsoleLogger();
    log({ time: new Date(0), event: "close", diagnostics: [] });
    vi.stubEnv("NO_COLOR", "1");
    log({ time: new Date(0), event: "close", diagnostics: [] });
  } finally {
    write.mockRestore();
    vi.unstubAllEnvs();
  }
  expect(writes[0]).toContain("\u001b[36m");
  expect(writes[1]).not.toContain("\u001b[");
});
