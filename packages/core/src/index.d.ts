import type {
  LoadRequest,
  OperationOptions,
  ProcessedLoadRequest,
  Session,
  SessionOptions,
  Snapshot,
} from "./types.js";

export type * from "./types.js";

/** 完成一次加载和处理后返回快照，失败以 LoadletError 拒绝 */
export declare function load<Source, Input, Output>(
  request: ProcessedLoadRequest<Source, Input, Output>,
  options?: OperationOptions,
): Promise<Snapshot<Output>>;
/** 完成一次加载后直接返回初始值的快照 */
export declare function load<Source, Value>(
  request: LoadRequest<Source, Value>,
  options?: OperationOptions,
): Promise<Snapshot<Value>>;

/** 建立监听并取得首个有效快照；初始化失败时释放资源并拒绝 */
export declare function open<Source, Input, Output>(
  request: ProcessedLoadRequest<Source, Input, Output>,
  options: SessionOptions,
): Promise<Session<Output>>;
/** 建立监听并直接发布加载值；返回时 current 已可读取 */
export declare function open<Source, Value>(
  request: LoadRequest<Source, Value>,
  options: SessionOptions,
): Promise<Session<Value>>;
