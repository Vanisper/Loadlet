import type { EvaluationContext, LoadletError, Snapshot, WatchConnection } from "../types.js";
import { normalizeDependency } from "../shared/dependency.js";
import { createAbortedError, createError, normalizeEvaluationError } from "../shared/errors.js";
import { type AnyRequest, evaluateRequest } from "../shared/request.js";
import { createSnapshot } from "../shared/snapshot.js";
import type { DependencyRegistry } from "./dependency-registry.js";
import type { SchedulerLease } from "./scheduler.js";

interface EvaluationOptions {
  readonly request: AnyRequest;
  readonly sessionId: string;
  readonly lease: SchedulerLease;
  readonly nextVersion: number;
  readonly registry: DependencyRegistry;
  readonly connection: WatchConnection;
  readonly isCurrent: () => boolean;
}

export type SessionEvaluationResult<Value> =
  | { readonly status: "published"; readonly snapshot: Snapshot<Value> }
  | { readonly status: "superseded" }
  | { readonly status: "failed"; readonly error: LoadletError }
  | { readonly status: "watch-failed"; readonly error: LoadletError };

export async function runEvaluation<Value>(
  options: EvaluationOptions,
): Promise<SessionEvaluationResult<Value>> {
  const dependencies = new Set<string>();
  let contextEnded = false;
  let stage: "load" | "process" = "load";
  let watchFailure: LoadletError | undefined;
  const { lease } = options;

  const context: EvaluationContext = {
    attempt: lease.attempt,
    signal: lease.controller.signal,
    track: async (file) => {
      if (contextEnded || !options.isCurrent()) {
        throw createError("SESSION_CLOSED", "Evaluation context has ended");
      }
      const dependency = normalizeDependency(file, lease.attempt);
      dependencies.add(dependency);
      try {
        await options.registry.watch(options.connection, dependency, lease.attempt);
      } catch (error) {
        watchFailure = error as LoadletError;
        throw error;
      }
      if (!options.isCurrent()) throw createAbortedError(lease.controller.signal);
    },
  };

  try {
    const outcome = await evaluateRequest<Value>(
      options.request,
      context,
      lease.controller.signal,
      () => {
        stage = "process";
      },
    );
    if (!options.isCurrent() || watchFailure) {
      options.registry.recover(dependencies);
      return watchFailure
        ? { status: "watch-failed", error: watchFailure }
        : { status: "superseded" };
    }

    try {
      const committed = await options.registry.commit(
        options.connection,
        dependencies,
        lease.attempt,
        options.isCurrent,
      );
      if (!committed) {
        options.registry.recover(dependencies);
        return { status: "superseded" };
      }
    } catch (error) {
      watchFailure = error as LoadletError;
      options.registry.recover(dependencies);
      return { status: "watch-failed", error: watchFailure };
    }

    const snapshot = createSnapshot(
      options.sessionId,
      options.nextVersion,
      lease.attempt,
      outcome.value,
      dependencies,
    );
    return { status: "published", snapshot };
  } catch (error) {
    options.registry.recover(dependencies);
    if (watchFailure) return { status: "watch-failed", error: watchFailure };
    if (!options.isCurrent()) return { status: "superseded" };
    return {
      status: "failed",
      error: normalizeEvaluationError(error, stage, lease.attempt),
    };
  } finally {
    contextEnded = true;
  }
}
