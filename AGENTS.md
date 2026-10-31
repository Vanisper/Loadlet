# Loadlet 开发约定

## 项目范围

当前阶段交付设计文档、类型声明和类型用例。运行时实现按路线图推进，各包保持 private。

- 依赖管理、格式、lint 和检查统一使用 Vite+；内部包依赖使用 `workspace:*`
- 核心维护加载、依赖、更新与生命周期，用户处理函数定义解析、合并和校验
- 公共接口调整同步更新声明、行为契约、调用示例及验收场景
- 类型用例验证编译关系，运行时行为通过相应实现测试验证
- 当前验证入口为 `vp run ready`，运行时测试建立后纳入 `vp test`
- 公开文档直接说明设计与使用方式，研究结论附可追溯的一手来源

## 中文与注释

文档按正常文章组织，源码注释精炼说明必要的契约、约束、边界与原因。

- 注释语言与项目语言一致；中文注释通常不以句号结尾
- 列表按语法结构选择末尾标点，同组结构保持统一
- JSDoc 摘要和补充说明之间保留空行，补充说明优先使用 `@description`
- 公共接口优先说明参数、返回值、状态变化、失败条件及顺序规则
- 整体注释承载共同语义，成员注释承载自身契约，避免跨层重复
- 架构取舍写入设计文档，内部注释仅保留非直观约束和维护原因
- 文件级说明与第一个导出符号的 JSDoc 分开，避免文档工具误挂

<!--VITE PLUS START-->

# Using Vite+, the Unified Toolchain for the Web

This project is using Vite+, a unified toolchain built on top of Vite, Rolldown, Vitest, tsdown, Oxlint, Oxfmt, and Vite Task. Vite+ wraps runtime management, package management, and frontend tooling in a single global CLI called `vp`. Vite+ is distinct from Vite, and it invokes Vite through `vp dev` and `vp build`. Run `vp help` to print a list of commands and `vp <command> --help` for information about a specific command.

Docs are local at `node_modules/vite-plus/docs` or online at https://viteplus.dev/guide/.

## Built-in Commands vs Scripts

`vp <name>` runs a built-in command. `vp run <name>` runs a `package.json` script or a `vite.config.ts` task. Scripts cannot overwrite built-ins, so `vp dev` and `vp run dev` may do different things. Check `package.json` and `vite.config.ts` first, and run `vp run <name>` when the project defines a script or task with that name.

## Running Scripts

Run TypeScript and JavaScript files with `vpx <file>`, for example `vpx ./scripts/seed.ts --dry-run`. It handles enums, decorators, JSX, and tsconfig `paths`, so do not add `tsx` or `ts-node` to run scripts. `vpx --watch <file>` reruns the file when a file it uses changes, in place of `tsx watch`. `vp node <file>` runs plain Node.js.

## Tool Versions

Run `vp toolchain` to show versions and relationships in the active Vite+
release. Add a tool name to select part of the graph. For example, run
`vp toolchain vite`. Use `--global` to ignore the local `vite-plus` package. Use
`vp why <package>` to show the package-manager dependency graph.

## Review Checklist

- [ ] Run `vp install` after pulling remote changes and before getting started.
- [ ] Run `vp check` and `vp test` to format, lint, type check and test changes.
- [ ] Check if there are `vite.config.ts` tasks or `package.json` scripts necessary for validation, run via `vp run <script>`.
- [ ] If setup, runtime, or package-manager behavior looks wrong, run `vp env doctor` and include its output when asking for help.

<!--VITE PLUS END-->
