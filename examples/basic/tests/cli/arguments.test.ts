import { resolve } from "node:path";
import { expect, it } from "vite-plus/test";
import { parseWatchArguments } from "../../src/cli/arguments.js";
import { watchFormatIds } from "../../src/index.js";

it("默认参数由配置域选择 YAML 模板", () => {
  expect(parseWatchArguments([])).toEqual({ type: "watch", file: undefined, format: undefined });
});

it("解析独立和等号形式的文件与格式参数", () => {
  const expected = { type: "watch", file: resolve("custom/config.json"), format: "json" };
  expect(
    parseWatchArguments(["--file", "custom/config.json", "--format", "json"], {
      formats: watchFormatIds,
    }),
  ).toEqual(expected);
  expect(
    parseWatchArguments(["--file=custom/config.json", "--format=json"], {
      formats: watchFormatIds,
    }),
  ).toEqual(expected);
  expect(
    parseWatchArguments(["--", "--format=json", "--file=custom/config.json"], {
      formats: watchFormatIds,
    }),
  ).toEqual(expected);
});

it("帮助、缺失参数和不支持格式给出明确结果", () => {
  expect(parseWatchArguments(["--help"])).toEqual({ type: "help" });
  expect(() => parseWatchArguments(["--unknown"])).toThrow("Unknown argument: --unknown");
  expect(() => parseWatchArguments(["--file"])).toThrow("--file requires a path");
  expect(() => parseWatchArguments(["--format"])).toThrow("--format requires an input format");
  expect(() => parseWatchArguments(["--format=xml"], { formats: watchFormatIds })).toThrow(
    "Unsupported format: xml",
  );
});
