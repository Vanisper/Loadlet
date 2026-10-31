import type { Loader } from "loadlet";
import type { ModuleNamespace } from "./types.js";

export type { ModuleNamespace } from "./types.js";

/**
 * 创建 JS/TS 模块加载器，返回完整模块命名空间
 *
 * @description 支持范围内的依赖每轮重新求值，解析失败前也要登记恢复目标
 */
export declare function moduleLoader(): Loader<URL, ModuleNamespace>;
