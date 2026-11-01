import { resolve } from "node:path";
import { expect, it } from "vite-plus/test";
import { parseWatchArguments } from "../../src/cli/arguments.js";

it("watch 参数提供默认配置路径", () => {
  expect(parseWatchArguments([])).toEqual({
    type: "watch",
    file: resolve(".local/config.yaml"),
  });
});

it("watch 参数支持指定配置文件", () => {
  const expected = resolve("custom/config.yaml");
  expect(parseWatchArguments(["--file", expected])).toEqual({
    type: "watch",
    file: expected,
  });
  expect(parseWatchArguments([`--file=${expected}`])).toEqual({
    type: "watch",
    file: expected,
  });
});

it("watch 参数支持帮助与错误输入", () => {
  expect(parseWatchArguments(["--help"])).toEqual({ type: "help" });
  expect(() => parseWatchArguments(["--unknown"])).toThrow("Unknown argument: --unknown");
  expect(() => parseWatchArguments(["--file"])).toThrow("--file requires a path");
});
