# 基础加载闭环示例

这个示例包覆盖文本、JSON、YAML、INI 和 JS/TS 模块五类输入。每类输入都会通过 `open()` 与 `fileWatcher()` 验证：

1. 初始内容加载成功
2. 内容变化后自动发布新版本
3. 无效内容只发布诊断并保留上一个成功快照
4. 内容恢复后自动重新求值

```sh
vp test examples/basic
```

启动常驻配置监听：

```sh
vp -C examples/basic run watch
```

首次运行会生成 `examples/basic/.local/config.yaml`。修改并保存该文件后，终端会输出新的 snapshot；写入非法 YAML 或空 `title` 时输出诊断并保留上一个成功结果；`Ctrl+C` 会关闭会话并输出清理结果。也可以指定文件：

```sh
vp -C examples/basic run watch -- --file ./custom.yaml
```

格式解析由示例中的处理函数完成；JS/TS 使用 `@loadlet/module`，其余输入使用 `@loadlet/node` 的文本加载器。
