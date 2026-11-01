import { expect, it } from "vite-plus/test";
import { moduleLoader } from "@loadlet/module";
import { load } from "loadlet";
import { fileUrl, writeText, withTempDirectory } from "./common/temp.js";

it("moduleLoader 支持 TypeScript 静态依赖并返回命名空间", async () => {
  await withTempDirectory(async (directory) => {
    const value = fileUrl(directory, "value.ts");
    const source = fileUrl(directory, "entry.ts");
    await writeText(value, "export const title: string = 'TS';\n");
    await writeText(source, `import { title } from './value.ts';\n\nexport { title };\n`);

    const snapshot = await load({
      source,
      loader: moduleLoader(),
      process: (namespace) => {
        if (typeof namespace.title !== "string") throw new Error("title must be a string");
        return namespace.title;
      },
    });

    expect(snapshot.value).toBe("TS");
    expect(snapshot.dependencies).toEqual([source.href, value.href]);
  });
});

it("moduleLoader 支持 JavaScript 静态依赖", async () => {
  await withTempDirectory(async (directory) => {
    const value = fileUrl(directory, "value.js");
    const source = fileUrl(directory, "entry.js");
    await writeText(value, "export const title = 'JS';\n");
    await writeText(source, `import { title } from './value.js';\n\nexport { title };\n`);

    const snapshot = await load({
      source,
      loader: moduleLoader(),
      process: (namespace) => {
        if (typeof namespace.title !== "string") throw new Error("title must be a string");
        return namespace.title;
      },
    });

    expect(snapshot.value).toBe("JS");
    expect(snapshot.dependencies).toEqual([source.href, value.href]);
  });
});

it("moduleLoader 每轮重新执行本地依赖", async () => {
  await withTempDirectory(async (directory) => {
    const value = fileUrl(directory, "value.js");
    const source = fileUrl(directory, "entry.ts");
    await writeText(value, "export const title = 'first';\n");
    await writeText(source, "import { title } from './value.js';\n\nexport { title };\n");

    const loadTitle = async () => {
      const snapshot = await load({
        source,
        loader: moduleLoader(),
        process: (namespace) => {
          if (typeof namespace.title !== "string") throw new Error("title must be a string");
          return namespace.title;
        },
      });
      return snapshot.value;
    };

    expect(await loadTitle()).toBe("first");
    await writeText(value, "export const title = 'second';\n");
    expect(await loadTitle()).toBe("second");
  });
});
