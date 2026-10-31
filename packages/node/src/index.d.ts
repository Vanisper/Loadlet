import type { EvaluationContext, Loader, Watcher } from "loadlet";

/** 创建读取 UTF-8 文本的加载器，读取前登记来源文件，保留 BOM 与换行 */
export declare function textLoader(): Loader<URL, string>;

/** 在当前求值中先登记依赖，再读取 UTF-8 文本；缺失或不可读时拒绝 */
export declare function readText(file: URL, context: EvaluationContext): Promise<string>;

/** 创建可重复建立独立连接的本地文件监听适配器，后端选型待契约验证 */
export declare function fileWatcher(): Watcher;
