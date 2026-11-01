# Loadlet

Composable loading with reliable reloads.

Loadlet 为应用和开发工具提供可组合的加载会话。加载器获取输入，用户函数生成结果，会话负责依赖监听、串行重载、失败恢复和关闭。

当前已完成核心会话、文本监听、JS/TS 模块加载与基础示例验证的最小闭环。各包保持 private，发布不在当前阶段。

## 接口预览

```ts
import { fileWatcher, textLoader } from "@loadlet/node";
import { open } from "loadlet";

const session = await open(
  {
    source: new URL("./title.txt", import.meta.url),
    loader: textLoader(),
    process: (text) => ({ title: text.trim() }),
  },
  {
    watcher: fileWatcher(),
  },
);

const unsubscribe = session.subscribe((event) => {
  if (event.type === "snapshot") console.log(event.snapshot.value.title);
  else console.error(event.diagnostic);
});

// 应用退出时结束订阅与会话
unsubscribe();
const result = await session.close();
console.error(...result.diagnostics);
```

一次性读取使用 `load()`。持续会话只发布完整成功的结果；更新失败时保留最后成功快照，输入修复后重新求值。解析、合并和校验由 `process` 中的普通函数完成，附加文件可通过 `readText(file, context)` 登记并读取。

## 文档

| 文档                          | 内容                         |
| ----------------------------- | ---------------------------- |
| [设计](docs/design.md)        | 组成方式、职责与扩展选择     |
| [接口](docs/api.md)           | 一次加载、会话及类型推导     |
| [行为契约](docs/contracts.md) | 发布、依赖、恢复、并发与关闭 |
| [适配器](docs/adapters.md)    | 文本、模块执行与宿主监听     |
| [验收场景](docs/scenarios.md) | 实现与选型的验证依据         |
| [技术调研](docs/research.md)  | 候选工具、证据与待验证问题   |
| [路线图](docs/roadmap.md)     | 首版范围与交付标准           |

## 工作区

| 目录              | 包                | 职责                     |
| ----------------- | ----------------- | ------------------------ |
| `packages/core`   | `loadlet`         | 加载请求、会话与扩展接口 |
| `packages/node`   | `@loadlet/node`   | 文本读取与本地文件监听   |
| `packages/module` | `@loadlet/module` | JS/TS 模块执行与依赖收集 |
| `examples/basic`  | 示例包            | 基础输入格式与模块闭环   |

适配器依赖核心协议，各自管理运行时依赖；文本消费者可以单独使用 Node 适配器。工作区使用 Vite+ 管理开发检查。

```sh
vp install
vp run ready
vp test
```
