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

  commit(): void {
    this.recovery.clear();
  }
}
