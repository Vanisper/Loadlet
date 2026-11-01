import { expect, it } from "vite-plus/test";
import { runJsonExample } from "../../src/index.js";

it("JSON 输入完成基础加载闭环", async () => {
  const result = await runJsonExample();

  expect(result.titles).toEqual(["JSON", "JSON updated", "JSON recovered"]);
  expect(result.versions).toEqual([1, 2, 3]);
  expect(result.diagnostics).toEqual(["PROCESS_FAILED"]);
  expect(result.dependencies).toEqual([result.source]);
});
