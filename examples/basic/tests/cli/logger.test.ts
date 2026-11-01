import { expect, it } from "vite-plus/test";
import { formatWatchLog } from "../../src/cli/logger.js";

it("格式化终端日志并缩进异常详情", () => {
  const text = formatWatchLog({
    time: new Date(0),
    level: "error",
    event: "diagnostic",
    message: "code=PROCESS_FAILED",
    detail: "first\nsecond",
  });

  expect(text).toMatch(/^08:00:00\.000 diagnostic code=PROCESS_FAILED\n {24}first\n {24}second$/);
});
