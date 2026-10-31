# 技术选型研究

Loadlet 将来源加载、用户处理和持续更新组合成一个会话。选型重点是让加载器提供足够的值与依赖信息，由会话统一承担发布、恢复和关闭。项目职责见[设计](design.md)，行为要求见[契约](contracts.md)，扩展方式见[适配器](adapters.md)。

本文的一手资料核对日期为 2026-11-01。候选尚未定型；固定版本源码用于说明具体行为，默认分支文档用于了解能力，正式选型时需固定版本并完成验证。

## 所需能力

可靠重载需要以下能力共同成立：

- **得到值**：读取文本或执行模块，将结果交给用户处理函数
- **记录依赖**：覆盖入口、受支持的间接引用，以及处理阶段显式登记的输入
- **重新求值**：下一次加载能够读取更新后的输入，缓存策略有明确范围
- **发现修复**：加载失败时仍保留缺失文件、解析候选等恢复依据
- **管理会话**：有序发布成功结果，维护监听集合，处理连续变化与关闭

这些能力应分别验收。成功返回一次值只验证了当前加载路径；依赖列表则需要结合缓存、失败和监听行为，才能形成持续更新保证。

## 分层候选

| 层次             | 候选与已确认能力                                                                                                                                                                                                                                                                                         | 主要评估点                                                                                 |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| 来源发现         | `unconfig` 提供来源与扩展名搜索，内部使用 `unconfig-core`。[文档](https://github.com/antfu-collective/unconfig/blob/main/README.md)、[依赖声明](https://github.com/antfu-collective/unconfig/blob/main/packages/unconfig/package.json)                                                                   | 显式来源可直接加载；需要搜索时再接入，并定义候选文件变化的监听方式                         |
| 打包执行         | `unrun` 使用 Rolldown，返回模块与依赖；`bundle-require` 使用 esbuild，返回模块与依赖并默认外部化 node_modules。[unrun](https://github.com/Gugustinette/unrun/blob/main/src/index.ts)、[bundle-require](https://github.com/egoist/bundle-require/blob/main/README.md)                                     | 以 unrun 为优先评估项，bundle-require 为对照；比较源位置、外部模块缓存、失败依赖与产物清理 |
| 原生执行         | `fresh-import` 创建独立 ESM 模块图，收集求值期间的静态相对依赖；`import-without-cache` 提供 Node 模块 hook 与依赖收集上下文。[fresh-import](https://github.com/sapphi-red/fresh-import/blob/main/README.md)、[import-without-cache](https://github.com/sxzz/import-without-cache/blob/main/src/index.ts) | 明确语法支持、包与延迟导入的覆盖范围，并验证多会话缓存与 hook 所有权                       |
| 转译与执行器组合 | `tsx` 的 `tsImport()` 提供局部 TypeScript 加载及 `onImport`；`importx` 统一多个执行器，提供缓存、依赖列表和回退选项。[tsx](https://github.com/privatenumber/tsx/blob/master/docs/dev-api/ts-import.md)、[importx](https://github.com/antfu-collective/importx/blob/main/README.md)                       | 依赖与缓存能力按执行路径验证；切换执行器时保持调用方可见的语义                             |
| 文本解析         | `confbox` 提供 YAML、TOML、JSONC 等解析工具。[文档](https://github.com/unjs/confbox/blob/main/README.md)                                                                                                                                                                                                 | 由用户处理函数或可选预设组合，格式与数据结构由消费者选择                                   |
| 监听与宿主接入   | 独立文件监听器和宿主 watcher 均通过适配器接入会话                                                                                                                                                                                                                                                        | 比较新增依赖的登记时序、缺失路径恢复、共享资源所有权和关闭能力                             |

评估现代工具时，优先考虑清晰的 ESM/Node 语义、可组合接口、失败诊断和维护成本。以上候选用于建立对照，不代表对同类方案的完整枚举。

## 证据与局限

### c12：配置方案的对照

c12 4.0.0-rc.4 的加载器包含多格式加载、配置层与合并能力。它的 watcher 根据入口候选和配置层构造监听列表；这条路径没有自动收集普通 `import` 的依赖图。默认原生加载为入口 URL 增加递增参数，子模块重新求值的保证仍需单独验证。[加载器源码](https://github.com/unjs/c12/blob/v4.0.0-rc.4/src/loader.ts)、[watcher 源码](https://github.com/unjs/c12/blob/v4.0.0-rc.4/src/watch.ts)

这说明配置搜索、分层合并与模块依赖重载是可分开评估的能力。c12 适合作为完整配置方案的对照；Loadlet 的选型还需验证加载和用户处理共同贡献依赖后的会话行为。上述结论限定于所列版本及源码路径。

### Vite 与 tsdown：组合方式的参考

Vite 8.3.5 的原生配置加载调用 `freshImport` 并返回依赖；不支持时存在普通 `import` 的回退路径。执行路径不同，依赖保证也需要分别确认。[固定版本源码](https://github.com/vitejs/vite/blob/v8.3.5/packages/vite/src/node/config.ts)

tsdown 的提交 `181af081d32905be8bab5d27524c382813bd26c5` 使用 unconfig-core 搜索配置，分别接入 import-without-cache 和 unrun 等加载路径，再将配置依赖交给 watcher。这个组合说明发现、执行和监听可以各自演进。[配置加载](https://github.com/rolldown/tsdown/blob/181af081d32905be8bab5d27524c382813bd26c5/src/config/file.ts)、[依赖监听](https://github.com/rolldown/tsdown/blob/181af081d32905be8bab5d27524c382813bd26c5/src/features/watch.ts)

据此，Loadlet 的评估方向是复用专门的加载工具，并通过自己的会话契约组合它们。源码复核支持这个职责划分；候选是否满足全部重载要求，仍以行为验证为准。

## 验证门槛

| 维度       | 验证场景                                                                                     |
| ---------- | -------------------------------------------------------------------------------------------- |
| 执行与缓存 | TS / JS、ESM / CJS、顶层 await；三层依赖修改叶子后重载；独立会话互不干扰                     |
| 依赖与路径 | 静态和受支持动态导入、处理阶段附加读取、解析元数据；根外 workspace、符号链接和嵌套模块源位置 |
| 失败恢复   | 语法错误、缺失导入、缺失多级目录、删除重建；连续失败后恢复集合收敛                           |
| 监听与调度 | 新依赖读取和监听登记之间的修改、突发事件、过期结果；关闭期间正在进行的加载                   |
| 资源与宿主 | 临时产物隔离、清理失败保留主错误、模块 hook 与共享 watcher 的所有权、长期重载的内存表现      |

先用文本加载与处理阶段附加依赖验证会话，再让模块执行器通过同一组契约场景。每项结果应记录版本、环境、支持范围与原始输出；文件监听以登记就绪后的一次实际修改验收，跨平台结果分别记录。

采用某个候选前，应能解释其成功路径和失败路径如何提供依赖依据。若需要补充适配，应把适配成本与支持范围一并纳入选型结论。
