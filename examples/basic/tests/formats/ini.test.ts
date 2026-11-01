import { expect, it } from "vite-plus/test";
import { runIniExample } from "../../src/index.js";

it("INI 输入完成基础加载闭环", async () => {
  const result = await runIniExample();

  expect(result.titles).toEqual(["INI", "INI updated", "INI recovered"]);
  expect(result.versions).toEqual([1, 2, 3]);
  expect(result.diagnostics).toEqual(["PROCESS_FAILED"]);
  expect(result.dependencies).toEqual([result.source]);
});
