# 基础配置加载示例

示例支持 YAML、JSON、INI、text、TS 和 JS。常驻终端与自动化测试共用格式注册、请求组装和监听流程，配置结果保留全部字段。

## 常驻终端

在仓库根目录执行：

```sh
vp -C examples/basic run watch
vp -C examples/basic run watch -- --format json
vp -C examples/basic run watch -- --format ini
vp -C examples/basic run watch -- --format text
vp -C examples/basic run watch -- --format ts
vp -C examples/basic run watch -- --format js
```

默认格式为 YAML。指定格式后，首次运行生成 `.local/config.<后缀>`，启动日志会显示绝对路径。已有文件保留原内容；`.local/` 由 Git 忽略。

也可以指定文件，按扩展名推断格式；显式 `--format` 优先：

```sh
vp -C examples/basic run watch -- --file ./custom.json
vp -C examples/basic run watch -- --format yaml --file ./.local/custom
```

`--file` 的相对路径基于 `examples/basic`。YAML 支持 `.yaml` 和 `.yml`，text 支持 `.txt` 和 `.text`，TS/JS 支持 `.ts`、`.mts`、`.js` 和 `.mjs`。

YAML、JSON 和 INI 须解析为对象，其中 `title` 是非空字符串，其余字段原样保留。text 将去除首尾空白后的全文作为 `title`。TS/JS 使用具名 `config` 导出：

```ts
export const config = {
  title: "Loadlet",
  items: ["overview"],
  enabled: true,
  server: { port: 8080 },
};
```

JS/TS 的本地相对依赖同样参与重载；模块支持范围见[适配器说明](../../docs/adapters.md#模块加载)。

每次保存合法配置，终端输出版本、尝试编号和完整结构化结果。解析或校验失败时，输出诊断和异常原因并保留上一个成功结果；修复后继续发布。终端支持颜色时会为事件和结果值着色，重定向输出自动关闭颜色，也可设置 `NO_COLOR=1`。

```text
10:00:00.000 snapshot   已发布 v2 attempt=3 dependencies=1
                        {
                          title: 'Loadlet',
                          items: [
                            'overview'
                          ],
                          enabled: true,
                          server: {
                            port: 8080
                          }
                        }
```

`Ctrl+C` 关闭会话并输出清理结果。启动时配置无效会以失败状态退出；打开后的普通配置错误保持常驻，监听故障则关闭并以失败状态退出。

## 自动化验证

```sh
vp test examples/basic
```

六种格式都验证初始加载、文件更新、失败保留、恢复和关闭。JS/TS 测试修改本地子依赖，以验证模块图重载。

```text
src/
  cli/       参数、信号与带颜色的终端渲染
  config/    类型、解析器、模板、格式注册、请求与监听流程
  shared/    文件准备
  index.ts   导出入口
tests/
  cli/       参数与渲染测试
  config/    一次加载与持续监听测试
  common/    临时目录与 fixture 驱动
  fixtures/  按 yaml/json/ini/text/ts/js 存放测试内容
```

fixtures 用 `.txt` 存储各阶段的原始内容，包含故意无效的语法。测试复制到临时目录时使用实际格式后缀，避免修改仓库内的原始用例。
