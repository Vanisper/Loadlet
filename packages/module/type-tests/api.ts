import type { ModuleNamespace } from "@loadlet/module";
import type { Snapshot } from "loadlet";
import { moduleLoader } from "@loadlet/module";
import { load } from "loadlet";

declare const source: URL;
declare const snapshot: Snapshot<ModuleNamespace>;

const namespace: Promise<Snapshot<ModuleNamespace>> = load({
  source,
  loader: moduleLoader(),
});
const selected: Promise<Snapshot<unknown>> = load({
  source,
  loader: moduleLoader(),
  process: (module) => module.default,
});
void [namespace, selected];

// @ts-expect-error 模块导出尚未经过用户校验
export const unsafeTitle: string = snapshot.value.title;
