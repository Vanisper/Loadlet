import { expect, it } from "vite-plus/test";
import { runYamlExample } from "../../src/index.js";

it("YAML 输入完成基础加载闭环", async () => {
  const result = await runYamlExample();

  expect(result.titles).toEqual(["YAML", "YAML updated", "YAML recovered"]);
  expect(result.versions).toEqual([1, 2, 3]);
  expect(result.diagnostics).toEqual(["PROCESS_FAILED"]);
  expect(result.dependencies).toEqual([result.source]);
});
