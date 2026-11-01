import { expect, it } from "vite-plus/test";
import { load } from "loadlet";
import { createTestLoader, mainFile } from "./common/loader.js";

it("load 发布处理结果并记录依赖", async () => {
  const snapshot = await load({
    source: mainFile,
    loader: createTestLoader(() => "Loadlet"),
    process: (value) => ({ title: value.trim() }),
  });

  expect(snapshot.value).toEqual({ title: "Loadlet" });
  expect(snapshot.version).toBe(1);
  expect(snapshot.attempt).toBe(1);
  expect(snapshot.dependencies).toEqual([mainFile.href]);
});

it("load 将处理异常转换为 LoadletError", async () => {
  await expect(
    load({
      source: mainFile,
      loader: createTestLoader(() => "bad"),
      process: () => {
        throw new Error("invalid input");
      },
    }),
  ).rejects.toMatchObject({
    name: "LoadletError",
    diagnostics: [{ code: "PROCESS_FAILED" }],
  });
});
