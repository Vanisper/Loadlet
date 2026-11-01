export interface SchedulerLease {
  readonly attempt: number;
  readonly generation: number;
  readonly controller: AbortController;
}

export class SessionScheduler {
  private generation = 0;
  private attempt = 0;
  private queued = false;
  private active: SchedulerLease | undefined;
  private readonly idleWaiters: (() => void)[] = [];

  get isRunning(): boolean {
    return this.active !== undefined;
  }

  invalidate(): void {
    this.generation += 1;
    this.queued = true;
    this.active?.controller.abort();
  }

  takeQueued(): boolean {
    const value = this.queued;
    this.queued = false;
    return value;
  }

  begin(): SchedulerLease {
    const lease: SchedulerLease = {
      attempt: ++this.attempt,
      generation: this.generation,
      controller: new AbortController(),
    };
    this.active = lease;
    return lease;
  }

  isCurrent(lease: SchedulerLease): boolean {
    return this.active === lease && lease.generation === this.generation;
  }

  finish(lease: SchedulerLease, canContinue: () => boolean): boolean {
    if (this.active !== lease) return false;
    this.active = undefined;
    for (const waiter of this.idleWaiters.splice(0)) waiter();
    return this.queued && canContinue() ? (this.takeQueued(), true) : false;
  }

  async waitIdle(): Promise<void> {
    if (!this.active) return;
    await new Promise<void>((resolve) => {
      this.idleWaiters.push(resolve);
    });
  }
}
