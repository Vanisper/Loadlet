import { expect, it } from "vite-plus/test";
import { runTextExample } from "../../src/index.js";

it("text 输入完成基础加载闭环", async () => {
  const result = await runTextExample();

  expect(result.titles).toEqual(["Hello", "Hello, Loadlet", "Recovered"]);
  expect(result.versions).toEqual([1, 2, 3]);
  expect(result.diagnostics).toEqual(["PROCESS_FAILED"]);
  expect(result.dependencies).toEqual([result.source]);
});
