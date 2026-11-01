/** 执行模块得到的命名空间，不隐式选择或展开 default 导出 */
export interface ModuleNamespace {
  readonly [name: string]: unknown;
}
