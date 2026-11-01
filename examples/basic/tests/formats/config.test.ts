import { expect, it } from "vite-plus/test";
import { parseBasicConfig } from "../../src/index.js";

it("解析并校验基础 YAML 配置", () => {
  expect(parseBasicConfig("title: Loadlet\n")).toEqual({ title: "Loadlet" });
  expect(() => parseBasicConfig("title:\n")).toThrow("Config title must be a non-empty string");
  expect(() => parseBasicConfig("- item\n")).toThrow("Config must be a mapping");
});
