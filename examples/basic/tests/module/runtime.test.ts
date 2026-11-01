import { expect, it } from "vite-plus/test";
import { runModuleExample } from "../../src/index.js";

it("JS/TS 模块完成基础加载闭环", async () => {
  const result = await runModuleExample();

  expect(result.titles).toEqual(["JS dependency", "JS updated", "JS recovered"]);
  expect(result.versions).toEqual([1, 2, 3]);
  expect(result.diagnostics).toEqual(["LOAD_FAILED"]);
  expect(result.dependencies).toEqual([result.entry, result.dependency]);
});
