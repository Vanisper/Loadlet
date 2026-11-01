import type {
  CloseResult,
  Diagnostic,
  DiagnosticCode,
  LoadletError,
  Session,
  SessionOptions,
  Snapshot,
  WatchConnection,
  WatchEvent,
} from "../types.js";
import { linkSignal } from "../shared/cancellation.js";
import { createAbortedError, createError } from "../shared/errors.js";
import { type AnyRequest } from "../shared/request.js";
import { DependencyRegistry } from "./dependency-registry.js";
import { runEvaluation } from "./evaluation.js";
import { createNotifier } from "./notifier.js";
import { SessionScheduler } from "./scheduler.js";
import type { CloseReason, ReloadWaiter, SessionEngineResult, SessionState } from "./state.js";

export function createSession<Value>(
  request: AnyRequest,
  options: SessionOptions,
): SessionEngineResult<Value> {
  const cancellation = linkSignal(options.signal);
  const sessionId = crypto.randomUUID();
  const registry = new DependencyRegistry();
  const scheduler = new SessionScheduler();
  const reloadWaiters = new Set<ReloadWaiter>();
  let connection: WatchConnection | undefined;
  let current: Snapshot<Value> | undefined;
  let state: SessionState = "open";
  let version = 0;
  let closePromise: Promise<CloseResult> | undefined;
  let openedResolve: (() => void) | undefined;
  let openedReject: ((error: LoadletError) => void) | undefined;
  const opened = new Promise<void>((resolve, reject) => {
    openedResolve = resolve;
    openedReject = reject;
  });
  const notifier = createNotifier<Value>({ canNotify: () => state === "open" });

  function failWaiters(error: LoadletError): void {
    for (const waiter of reloadWaiters) waiter.reject(error);
    reloadWaiters.clear();
  }

  function settleOpened(): void {
    openedResolve?.();
    openedResolve = undefined;
    openedReject = undefined;
  }

  function settleFailure(error: LoadletError): void {
    openedReject?.(error);
    openedResolve = undefined;
    openedReject = undefined;
    failWaiters(error);
    notifier.emit({
      type: "diagnostic",
      diagnostic: error.diagnostics[0] satisfies Diagnostic,
    });
  }

  function settleSnapshot(snapshot: Snapshot<Value>): void {
    current = snapshot;
    version = snapshot.version;
    settleOpened();
    for (const waiter of reloadWaiters) waiter.resolve(snapshot);
    reloadWaiters.clear();
    notifier.emit({ type: "snapshot", snapshot });
  }

  function scheduleNext(): void {
    if (scheduler.isRunning || !scheduler.takeQueued()) return;
    void runNextEvaluation();
  }

  async function runNextEvaluation(): Promise<void> {
    const lease = scheduler.begin();
    const result = await runEvaluation<Value>({
      request,
      sessionId,
      lease,
      nextVersion: version + 1,
      registry,
      connection: connection!,
      isCurrent: () => state === "open" && scheduler.isCurrent(lease),
    });

    if (result.status === "published") settleSnapshot(result.snapshot);
    else if (result.status === "failed") settleFailure(result.error);

    if (scheduler.finish(lease, () => state === "open")) void runNextEvaluation();
  }

  function invalidateAndSchedule(): void {
    if (state !== "open") return;
    scheduler.invalidate();
    scheduleNext();
  }

  function closeReasonFromCode(code: DiagnosticCode): CloseReason {
    return code === "ABORTED" ? "aborted" : "explicit";
  }

  function terminate(error: LoadletError, notify = true): void {
    if (state !== "open") return;
    state = "closing";
    scheduler.invalidate();
    openedReject?.(error);
    openedResolve = undefined;
    openedReject = undefined;
    failWaiters(error);
    if (notify) notifier.emit({ type: "diagnostic", diagnostic: error.diagnostics[0] }, true);
    void close(closeReasonFromCode(error.diagnostics[0].code));
  }

  async function close(reason: CloseReason = "explicit"): Promise<CloseResult> {
    if (closePromise) return closePromise;
    state = "closing";
    scheduler.invalidate();
    const error =
      reason === "aborted"
        ? createAbortedError(cancellation.signal)
        : createError("SESSION_CLOSED", "Session is closed");
    failWaiters(error);

    const result = (async () => {
      const diagnostics: Diagnostic[] = [];
      await scheduler.waitIdle();
      try {
        await connection?.close();
      } catch (cause) {
        diagnostics.push({ code: "CLEANUP_FAILED", message: "Failed to close watcher", cause });
      }
      state = "closed";
      openedReject?.(error);
      openedResolve = undefined;
      openedReject = undefined;
      return { diagnostics: Object.freeze(diagnostics) };
    })();
    closePromise = result;
    return result;
  }

  function handleWatchEvent(event: WatchEvent) {
    if (state !== "open") return;
    if (event.type === "error") {
      terminate(createError("WATCH_FAILED", "File watcher failed", { cause: event.cause }));
      return;
    }
    if (event.files.some((file) => registry.isWatched(file))) invalidateAndSchedule();
  }

  const session: Session<Value> = {
    get current() {
      if (!current) throw createError("SESSION_CLOSED", "Session has no successful snapshot");
      return current;
    },
    get state() {
      return state;
    },
    subscribe(listener) {
      if (state !== "open") throw createError("SESSION_CLOSED", "Session is closed");
      const unsubscribe = notifier.subscribe(listener);
      if (current) notifier.emit({ type: "snapshot", snapshot: current });
      return unsubscribe;
    },
    reload() {
      if (state !== "open") {
        return Promise.reject(createError("SESSION_CLOSED", "Session is closed"));
      }
      invalidateAndSchedule();
      return new Promise<Snapshot<Value>>((resolve, reject) => {
        reloadWaiters.add({
          resolve: resolve as ReloadWaiter["resolve"],
          reject,
        });
      });
    },
    close: () => close(),
  };

  if (options.signal?.aborted) {
    state = "closing";
    const error = createAbortedError(options.signal);
    openedReject?.(error);
    openedResolve = undefined;
    openedReject = undefined;
    void close("aborted");
  } else {
    options.signal?.addEventListener(
      "abort",
      () => terminate(createAbortedError(cancellation.signal)),
      { once: true },
    );

    void (async () => {
      try {
        const connected = await options.watcher.connect(handleWatchEvent);
        if (state !== "open") return;
        connection = connected;
        void runNextEvaluation();
      } catch (error) {
        terminate(
          createError("WATCH_FAILED", "Failed to connect file watcher", { cause: error }),
          false,
        );
      }
    })();
  }

  return { session, opened };
}
