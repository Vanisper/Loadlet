import type { Loader, Processor, Session, Snapshot, Watcher } from "loadlet";
import { load, open } from "loadlet";

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
type Expect<T extends true> = T;

declare const source: URL;
declare const loader: Loader<URL, string>;
declare const process: Processor<string, { title: string }>;
declare const watcher: Watcher;
declare const session: Session<string>;

const raw = load({ source, loader });
const transformed = load({ source, loader, process });
const watched = open({ source, loader, process }, { watcher });
void [raw, transformed, watched];

export type InferenceChecks = [
  Expect<Equal<Awaited<typeof raw>, Snapshot<string>>>,
  Expect<Equal<Awaited<typeof transformed>, Snapshot<{ title: string }>>>,
  Expect<Equal<Awaited<typeof watched>, Session<{ title: string }>>>,
];

session.subscribe((event) => {
  if (event.type === "snapshot") {
    const value: string = event.snapshot.value;
    void value;
  } else {
    const message: string = event.diagnostic.message;
    void message;
  }
});

// @ts-expect-error 持续会话必须提供监听能力
void open({ source, loader });

// @ts-expect-error 没有处理函数不能指定另一个输出类型
void load<URL, string, number>({ source, loader });

// @ts-expect-error 异步业务函数不能作为同步订阅者
session.subscribe(async () => {});

// @ts-expect-error 快照版本只读
session.current.version = 2;

void load({
  source,
  loader,
  // @ts-expect-error 处理输入必须匹配加载值
  process: (value: number) => value,
});
