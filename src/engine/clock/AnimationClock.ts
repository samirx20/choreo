type ClockListener = (time: number) => void;

/**
 * High-performance transient animation clock.
 * Employs an imperative pub/sub pattern to drive 60fps playhead movement,
 * canvas render loops, and timecode readouts without triggering full React VDOM diffs.
 */
class AnimationClock {
  private time = 0;
  private listeners: Set<ClockListener> = new Set();
  private rafId: number | null = null;
  private isRunning = false;
  private lastRafTime = 0;

  public getTime(): number {
    return this.time;
  }

  public setTime(time: number): void {
    this.time = Math.max(0, time);
    this.notify();
  }

  public subscribe(listener: ClockListener): () => void {
    this.listeners.add(listener);
    listener(this.time);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    for (const listener of this.listeners) {
      try {
        listener(this.time);
      } catch (err) {
        console.error("AnimationClock listener error:", err);
      }
    }
  }

  public start(maxDuration = 10, onTick?: (time: number) => void): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastRafTime = performance.now();

    const loop = (now: number) => {
      if (!this.isRunning) return;
      const dt = (now - this.lastRafTime) / 1000;
      this.lastRafTime = now;

      let nextTime = this.time + dt;
      if (nextTime >= maxDuration) {
        nextTime = 0; // loop back to 0
      }
      this.time = nextTime;
      this.notify();
      if (onTick) onTick(this.time);

      this.rafId = requestAnimationFrame(loop);
    };

    this.rafId = requestAnimationFrame(loop);
  }

  public stop(): void {
    this.isRunning = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }
}

export const animationClock = new AnimationClock();
