export interface Cancellation {
  readonly signal: AbortSignal;
  dispose: () => void;
}

export function linkSignal(signal: AbortSignal | undefined): Cancellation {
  const controller = new AbortController();
  if (!signal) {
    return { signal: controller.signal, dispose: () => {} };
  }

  const abort = () => controller.abort(signal.reason);
  if (signal.aborted) abort();
  else signal.addEventListener("abort", abort, { once: true });

  return {
    signal: controller.signal,
    dispose: () => signal.removeEventListener("abort", abort),
  };
}
