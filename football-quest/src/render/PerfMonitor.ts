/** Rolling frame-time statistics, sampled from the real render loop. */
export class PerfMonitor {
  private frames = 0;
  private accum = 0;
  private worst = 0;
  private lastFps = 0;
  private lastWorstMs = 0;

  record(dtSeconds: number): void {
    this.frames++;
    this.accum += dtSeconds;
    this.worst = Math.max(this.worst, dtSeconds);
    if (this.accum >= 1) {
      this.lastFps = this.frames / this.accum;
      this.lastWorstMs = this.worst * 1000;
      this.frames = 0;
      this.accum = 0;
      this.worst = 0;
    }
  }

  get fps(): number { return this.lastFps; }
  /** Longest frame in the last window — spikes here usually mean GC or shader compilation. */
  get worstFrameMs(): number { return this.lastWorstMs; }

  memoryMb(): number | null {
    const mem = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory;
    return mem ? mem.usedJSHeapSize / (1024 * 1024) : null;
  }
}
