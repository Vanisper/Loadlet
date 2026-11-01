# 接口与用法

Loadlet 通过 `load` 取得一次结果，通过 `open` 持续维护结果。两者接受相同的来源、加载器和可选处理函数。

本文的 TypeScript 示例用于审阅接口。源码入口见 [core](../packages/core/src/index.ts)、[node](../packages/node/src/index.ts) 和 [module](../packages/module/src/index.ts)。

## 一次加载

```ts
import { textLoader } from "@loadlet/node";
import { load } from "loadlet";

const snapshot = await load({
  source: new URL("./title.txt", import.meta.url),
  loader: textLoader(),
  process: (text) => ({ title: text.trim() }),
});
```

`snapshot.value` 推导为 `{ title: string }`。省略 `process` 时，结果就是加载器返回的字符串。

| 请求类型                        | 成员                          | 输出       |
| ------------------------------- | ----------------------------- | ---------- |
| `LoadRequest<S, V>`             | `source`、`loader`            | 加载值 `V` |
| `ProcessedLoadRequest<S, I, O>` | `source`、`loader`、`process` | 处理值 `O` |

这两个类型描述调用参数。`process` 是普通函数，可以在内部组合解析、合并和校验操作；处理失败时抛错即可阻止发布。核心以两个重载保证省略处理函数时，输出类型与加载值一致。

## 持续会话

```ts
import { fileWatcher, textLoader } from "@loadlet/node";
import { open } from "loadlet";

const session = await open(
  {
    source: new URL("./title.txt", import.meta.url),
    loader: textLoader(),
  },
  { watcher: fileWatcher() },
);

const unsubscribe = session.subscribe((event) => {
  if (event.type === "snapshot") console.log(event.snapshot.value);
  else console.error(event.diagnostic);
});
```

`open` 返回时已有成功快照，订阅立即收到当前值。输入变化后重新加载；更新失败保留最后成功结果，修复输入后继续更新。

| 成员                  | 调用契约                                         |
| --------------------- | ------------------------------------------------ |
| `current`             | 读取最后成功快照，关闭后仍可读                   |
| `state`               | `open`、`closing` 或 `closed`                    |
| `subscribe(listener)` | 同步回放 current，随后按序通知；返回幂等取消函数 |
| `reload()`            | 等待覆盖本次请求的有效轮次，可与其他请求合并     |
| `close()`             | 停止更新，等待在途求值与资源释放，返回清理诊断   |

应用退出时取消订阅并等待 `session.close()`。订阅回调返回 `undefined`；异步写文件、连接数据库等工作由应用调度、捕获错误和等待结束。

## 在处理阶段读取附加文件

```ts
import { readText, textLoader } from "@loadlet/node";
import { load } from "loadlet";

const source = new URL("./title.txt", import.meta.url);
const snapshot = await load({
  source,
  loader: textLoader(),
  process: async (title, context) => ({
    title: title.trim(),
    footer: await readText(new URL("./footer.txt", source), context),
  }),
});
```

`readText` 先登记文件，再读取内容。换成 `open` 后，入口与 footer 都会参与持续更新。自定义 I/O 先调用 `await context.track(file)`，再执行读取；目标尚不存在时也应登记，以便捕获后续创建。

每轮的 `EvaluationContext` 提供 `attempt`、`signal` 与 `track`。加载器和处理函数共享本轮上下文，异步工作应在函数返回前完成。

## 加载器与监听器

| 接口或入口                | 用途                                                         |
| ------------------------- | ------------------------------------------------------------ |
| `Loader<S, V>`            | 提供 `name` 与 `load(source, context)`，得到初始值并登记输入 |
| `Processor<I, O>`         | 处理初始值，返回同步或异步结果                               |
| `textLoader()`            | 读取 UTF-8 文本，保留 BOM、空白和换行                        |
| `readText(file, context)` | 在本轮中跟踪附加文本读取                                     |
| `moduleLoader()`          | 返回完整模块命名空间，导出成员为 `unknown`                   |
| `fileWatcher()`           | 为会话建立独立的本地监听连接                                 |
| `Watcher`                 | 供宿主接入现有监听设施的接口                                 |

模块的 default 导出由用户选择和校验；自定义来源的形状由加载器决定。适配器支持范围和监听就绪规则见[适配器契约](adapters.md)。

## 快照、错误与取消

快照包含 `id`、`version`、`attempt`、`value` 和 `dependencies`。`id` 标识一次加载或一个会话，`version` 只在同一 id 内比较；每次成功发布递增，失败保持原版本。

`load`、`open`、`reload` 以 `LoadletError` 拒绝：它是带有 `name: 'LoadletError'` 与非空 `diagnostics` 的 Error 结构。首项诊断保留主要失败，原始原因存于 `cause`。`close` 通过返回值报告清理错误。

第二个参数接受 `signal`。对 `load`，它取消本次求值；对 `open`，它覆盖整个会话生命周期。来源和环境参数在会话内固定，切换环境时以新请求打开新会话。

完整的发布顺序、失败恢复、订阅重入和关闭语义见[行为契约](contracts.md)。
