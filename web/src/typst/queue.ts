// A queue of tasks run one at a time (the WASM compiler isn't concurrent).
// Tasks with the same "latest" key replace each other: while the user drags a slider,
// we only compile the last version, and the skipped ones get onDrop.

export interface Job {
  run: () => Promise<void>;
  // tasks with the same key replace each other in the queue
  latest?: string;
  onDrop?: () => void;
}

export class SerialQueue {
  private jobs: Job[] = [];
  private busy = false;

  push(job: Job): void {
    if (job.latest) {
      const old = this.jobs.findIndex((j) => j.latest === job.latest);
      if (old >= 0) {
        this.jobs[old]!.onDrop?.();
        this.jobs.splice(old, 1);
      }
    }
    this.jobs.push(job);
    void this.drain();
  }

  get size(): number {
    return this.jobs.length;
  }

  private async drain(): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    try {
      let job: Job | undefined;
      while ((job = this.jobs.shift())) {
        try {
          await job.run();
        } catch (e) {
          // tasks report errors to the website themselves; here we just keep the queue from stopping
          console.error(e);
        }
      }
    } finally {
      this.busy = false;
    }
  }
}
