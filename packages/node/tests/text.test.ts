import { expect, it } from "vite-plus/test";
import { readText, textLoader } from "@loadlet/node";
import { load } from "loadlet";
import { fileUrl, writeText, withTempDirectory } from "./common/temp.js";

it("textLoader 保留文本内容并登记来源", async () => {
  await withTempDirectory(async (directory) => {
    const source = fileUrl(directory, "main.txt");
    await writeText(source, "  Hello\n");

    const snapshot = await load({
      source,
      loader: textLoader(),
      process: (value) => value.length,
    });

    expect(snapshot.value).toBe(8);
    expect(snapshot.dependencies).toEqual([source.href]);
  });
});

it("readText 在处理阶段登记并读取附加文本", async () => {
  await withTempDirectory(async (directory) => {
    const source = fileUrl(directory, "main.txt");
    const extra = fileUrl(directory, "extra.txt");
    await writeText(source, "main");
    await writeText(extra, "extra");

    const snapshot = await load({
      source,
      loader: textLoader(),
      process: async (value, context) => `${value}:${await readText(extra, context)}`,
    });

    expect(snapshot.value).toBe("main:extra");
    expect(snapshot.dependencies).toEqual([extra.href, source.href]);
  });
});
