import { readFile } from "node:fs/promises";
import { expect, it } from "vite-plus/test";
import { load } from "loadlet";
import {
  createWatchConfigRequest,
  resolveWatchFormat,
  watchFormats,
  watchFormatIds,
} from "../../src/index.js";
import { readConfigFixture, withConfigFixture } from "../common/fixtures.js";
import { withExampleDirectory, fileUrl, writeText } from "../common/files.js";
import { ensureTextFile } from "../../src/shared/files.js";

it.each(watchFormatIds)("%s 格式在一次加载中保留完整配置", async (id) => {
  await withConfigFixture(id, async ({ source, dependency }) => {
    const snapshot = await load(createWatchConfigRequest(watchFormats[id], source));
    const expected =
      id === "text"
        ? { title: "initial" }
        : {
            title: "initial",
            enabled: true,
            items: ["overview"],
            server: { port: id === "ini" ? "8080" : 8080 },
          };
    expect(snapshot.value).toEqual(expected);
    expect(snapshot.dependencies).toEqual([...new Set([source.href, dependency.href])].sort());
  });
});

it("自动推断扩展名，显式格式优先，未知格式明确报错", () => {
  expect(resolveWatchFormat({}).id).toBe("yaml");
  expect(resolveWatchFormat({ extension: ".YML" }).id).toBe("yaml");
  expect(resolveWatchFormat({ extension: ".mts" }).id).toBe("ts");
  expect(resolveWatchFormat({ extension: ".mjs" }).id).toBe("js");
  expect(resolveWatchFormat({ id: "json", extension: ".yaml" }).id).toBe("json");
  expect(() => resolveWatchFormat({ extension: ".unknown" })).toThrow("Cannot infer format");
  expect(() => resolveWatchFormat({ id: "toString" })).toThrow("Unsupported format");
});

it.each(watchFormatIds)("%s 默认模板可直接加载，已有文件不会被覆盖", async (id) => {
  await withExampleDirectory(async (directory) => {
    const format = watchFormats[id];
    const file = fileUrl(directory, `config${format.extensions[0]}`);
    await ensureTextFile(file, format.defaultText);
    const snapshot = await load(createWatchConfigRequest(format, file));
    expect(snapshot.value.title).toBe("Loadlet");
    if (id !== "text") expect(snapshot.value).toMatchObject({ items: ["overview"], enabled: true });
    await writeText(file, await readConfigFixture(id, "invalid"));
    await ensureTextFile(file, format.defaultText);
    expect(await readFile(file, "utf8")).toBe(await readConfigFixture(id, "invalid"));
  });
});
