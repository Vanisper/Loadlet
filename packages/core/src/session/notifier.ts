import type { SessionEvent, SessionListener, Unsubscribe } from "../types.js";

interface NotifierOptions {
  readonly canNotify: () => boolean;
}

export interface SessionNotifier<Value> {
  subscribe: (listener: SessionListener<Value>) => Unsubscribe;
  emit: (event: SessionEvent<Value>, force?: boolean) => void;
}

function isWatchFailure<Value>(event: SessionEvent<Value>): boolean {
  return event.type === "diagnostic" && event.diagnostic.code === "WATCH_FAILED";
}

export function createNotifier<Value>(options: NotifierOptions): SessionNotifier<Value> {
  const listeners = new Set<SessionListener<Value>>();
  const queue: SessionEvent<Value>[] = [];
  let notifying = false;

  function emit(event: SessionEvent<Value>, force = false) {
    if (!force && !options.canNotify()) return;
    if (notifying) {
      queue.push(event);
      return;
    }

    notifying = true;
    try {
      for (const listener of Array.from(listeners)) {
        if (!force && !options.canNotify()) break;
        try {
          const result = listener(event) as unknown;
          if (result && typeof (result as PromiseLike<unknown>).then === "function") {
            void (result as PromiseLike<unknown>).then(undefined, (error: unknown) => {
              if (!options.canNotify()) return;
              listeners.delete(listener);
              emit({
                type: "diagnostic",
                diagnostic: {
                  code: "SUBSCRIBER_FAILED",
                  message: "Session listener failed",
                  cause: error,
                },
              });
            });
          }
        } catch (error) {
          listeners.delete(listener);
          if (options.canNotify()) {
            queue.push({
              type: "diagnostic",
              diagnostic: {
                code: "SUBSCRIBER_FAILED",
                message: "Session listener failed",
                cause: error,
              },
            });
          }
        }
      }
    } finally {
      notifying = false;
      const next = queue.shift();
      if (next) emit(next, isWatchFailure(next));
    }
  }

  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    emit,
  };
}
