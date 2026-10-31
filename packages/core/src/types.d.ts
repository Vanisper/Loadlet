/** 同步值或可等待的值 */
export type Awaitable<T> = T | PromiseLike<T>;

/** 单次求值中可登记依赖的上下文 */
export interface EvaluationContext {
  /** 当前调用内递增的尝试编号，失败和被取代的尝试也占用编号 */
  readonly attempt: number;
  /** 关闭、取消或本轮被取代时中止；用户函数应主动响应 */
  readonly signal: AbortSignal;
  /**
   * 在读取前登记本地文件，允许目标尚不存在
   *
   * @description
   * - 仅接受无查询参数和片段的绝对 file URL
   * - 会话中等待监听就绪后完成；一次加载中仅记录依赖
   * - 本轮结束或被取消后拒绝，不能将此上下文留给后台任务
   */
  track: (file: URL) => Promise<void>;
}

/** 从来源获取初始值，并登记读取涉及的输入 */
export interface Loader<Source, Value> {
  /** 用于定位诊断的稳定名称 */
  readonly name: string;
  /** 完成本轮全部读取和清理后返回；失败可以抛出任意原因 */
  readonly load: (source: Source, context: EvaluationContext) => Awaitable<Value>;
}

/** 将初始值处理为发布值，额外读取同样需要先登记依赖 */
export type Processor<Input, Output> = (
  value: Input,
  context: EvaluationContext,
) => Awaitable<Output>;

/** 直接采用加载值的请求 */
export interface LoadRequest<Source, Value> {
  /** 每次求值使用同一来源，调用方不得在会话期间修改 */
  readonly source: Source;
  readonly loader: Loader<Source, Value>;
  /** 省略时直接发布加载结果 */
  readonly process?: never;
}

/** 包含结果处理函数的加载请求 */
export interface ProcessedLoadRequest<Source, Input, Output> {
  /** 每次求值使用同一来源，调用方不得在会话期间修改 */
  readonly source: Source;
  readonly loader: Loader<Source, Input>;
  readonly process: Processor<Input, Output>;
}

/** 一次成功求值的结果；发布值的所有者须遵守发布后不再修改的约定 */
export interface Snapshot<Value> {
  /** 当前一次加载或会话的标识，仅在相同 id 内比较版本 */
  readonly id: string;
  /** 从 1 开始，每次成功发布递增，与值是否相等无关 */
  readonly version: number;
  /** 产生本结果的求值尝试编号 */
  readonly attempt: number;
  /** 任意用户值，核心不克隆、不深度冻结、不就地修改 */
  readonly value: Value;
  /** 本次成功求值的规范化文件 URL 字符串，不含其他失败轮的恢复目标 */
  readonly dependencies: readonly string[];
}

/** 可用于程序分支的诊断类别 */
export type DiagnosticCode =
  | "LOAD_FAILED"
  | "PROCESS_FAILED"
  | "WATCH_FAILED"
  | "SUBSCRIBER_FAILED"
  | "CLEANUP_FAILED"
  | "ABORTED"
  | "SESSION_CLOSED"
  | "INVALID_DEPENDENCY";

/** 一次失败或生命周期异常的可观察信息 */
export interface Diagnostic {
  readonly code: DiagnosticCode;
  readonly message: string;
  /** 原始错误或拒绝原因，保持原引用，不保证可序列化 */
  readonly cause?: unknown;
  /** 与求值关联时提供；独立监听故障和清理错误可以没有编号 */
  readonly attempt?: number;
  /** 与特定文件关联时提供规范化的 file URL 字符串 */
  readonly file?: string;
}

/** load、open 和 reload 的拒绝原因，diagnostics 首项保留主要失败 */
export interface LoadletError extends Error {
  readonly name: "LoadletError";
  readonly diagnostics: readonly [Diagnostic, ...Diagnostic[]];
}

/** 成功快照通知 */
export interface SnapshotEvent<Value> {
  readonly type: "snapshot";
  readonly snapshot: Snapshot<Value>;
}

/** 不改变当前成功版本的诊断通知 */
export interface DiagnosticEvent {
  readonly type: "diagnostic";
  readonly diagnostic: Diagnostic;
}

/** 会话通知；订阅时仅同步回放当前快照，不回放历史诊断 */
export type SessionEvent<Value> = SnapshotEvent<Value> | DiagnosticEvent;

/** 同步通知函数；异步业务工作由调用方另行调度 */
export type SessionListener<Value> = (event: SessionEvent<Value>) => undefined;

/** 可重复调用的取消订阅函数 */
export type Unsubscribe = () => void;

/** 关闭完成后的清理结果 */
export interface CloseResult {
  /** 仅含清理失败，按发生顺序排列，空数组表示释放成功 */
  readonly diagnostics: readonly Diagnostic[];
}

/** 维护最后成功快照的持续加载会话 */
export interface Session<Value> {
  /** 关闭后仍可读取最后成功快照 */
  readonly current: Snapshot<Value>;
  readonly state: "open" | "closing" | "closed";
  /**
   * 同步订阅并立即收到当前快照
   *
   * @description 关闭开始后抛出 SESSION_CLOSED；监听者抛错会取消该订阅并向其余订阅者报告
   */
  subscribe: (listener: SessionListener<Value>) => Unsubscribe;
  /**
   * 请求重新求值并等待覆盖本次请求的有效结果
   *
   * @description 可与后续请求合并；被取代的轮次不结算，最终失败或关闭时拒绝
   */
  reload: () => Promise<Snapshot<Value>>;
  /**
   * 立即停止接收更新并等待在途求值及资源释放
   *
   * @description 幂等，不等待订阅者启动的业务任务；清理失败通过返回值报告
   */
  close: () => Promise<CloseResult>;
}

/** 一次加载或持续会话的取消选项 */
export interface OperationOptions {
  /** 对 open 覆盖整个会话生命周期，中止后自动开始关闭 */
  readonly signal?: AbortSignal;
}

/** 持续会话使用的外部能力 */
export interface SessionOptions extends OperationOptions {
  /** 每次 open 获得独立连接，核心仅释放该连接拥有的监听 */
  readonly watcher: Watcher;
}

/** 已登记文件的内容、存在性或解析身份发生变化 */
export interface FileChange {
  readonly type: "change";
  /** 规范化的 file URL 字符串，允许合并多个文件事件 */
  readonly files: readonly string[];
}

/** 监听完整性已无法保证，接收此事件的会话会终止 */
export interface WatchFailure {
  readonly type: "error";
  readonly cause: unknown;
}

/** 监听连接产生的同步输入事件 */
export type WatchEvent = FileChange | WatchFailure;

/** 一个会话独占的文件监听租约 */
export interface WatchConnection {
  /**
   * 添加精确文件目标，完成后即可安全开始读取
   *
   * @description
   * - 幂等，支持不存在的文件及祖先目录
   * - 安装过程中的变化必须缓冲或校验补发
   * - 同时跟踪符号链接自身与目标身份，具体后端负责路径映射
   */
  add: (files: readonly string[]) => Promise<void>;
  /** 移除本连接的登记，不能取消其他会话或宿主拥有的监听 */
  remove: (files: readonly string[]) => Promise<void>;
  /** 释放本连接；失败以拒绝报告，完成后不再调用 notify */
  close: () => Promise<void>;
}

/** 可由独立文件监听器或宿主 watcher 实现的适配接口 */
export interface Watcher {
  /** 建立独立连接；未能返回连接时由适配器清理部分资源 */
  connect: (notify: (event: WatchEvent) => void) => Awaitable<WatchConnection>;
}
