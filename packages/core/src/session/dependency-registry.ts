import type { WatchConnection } from "../types.js";
import { createError } from "../shared/errors.js";

export class DependencyRegistry {
  private readonly watched = new Set<string>();
  private readonly recovery = new Set<string>();

  isWatched(file: string): boolean {
    return this.watched.has(file);
  }

  async watch(connection: WatchConnection, file: string, attempt: number): Promise<void> {
    if (this.watched.has(file)) return;
    this.watched.add(file);
    try {
      await connection.add([file]);
    } catch (error) {
      throw createError("WATCH_FAILED", "Failed to watch dependency", {
        cause: error,
        file,
        attempt,
      });
    }
  }

  recover(dependencies: ReadonlySet<string>): void {
    for (const dependency of dependencies) this.recovery.add(dependency);
  }

  async commit(
    connection: WatchConnection,
    dependencies: ReadonlySet<string>,
    attempt: number,
    isCurrent: () => boolean,
  ): Promise<boolean> {
    const retired = [...this.watched].filter((file) => !dependencies.has(file));
    if (retired.length > 0) {
      try {
        await connection.remove(retired);
      } catch (error) {
        throw createError("WATCH_FAILED", "Failed to retire dependency", {
          cause: error,
          attempt,
        });
      }

      if (!isCurrent()) {
        try {
          await connection.add(retired);
        } catch (error) {
          throw createError("WATCH_FAILED", "Failed to restore dependency", {
            cause: error,
            attempt,
          });
        }
        return false;
      }
    }

    for (const file of retired) this.watched.delete(file);
    this.recovery.clear();
    return true;
  }
}
