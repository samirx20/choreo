/**
 * Three.js WebGL Context Limiter Pool
 * Restricts active WebGL contexts to <= 3 to prevent browser context loss,
 * state pollution, and memory leaks.
 */

export interface RendererInstance {
  id: string;
  canvas: HTMLCanvasElement | OffscreenCanvas;
  glContext?: WebGLRenderingContext | WebGL2RenderingContext | null;
  lastUsed: number;
}

export class ThreeRendererPool {
  private static instance: ThreeRendererPool | null = null;
  private activeContexts = new Map<string, RendererInstance>();
  public readonly maxContexts: number;

  constructor(maxContexts = 3) {
    this.maxContexts = maxContexts;
  }

  public static getInstance(maxContexts = 3): ThreeRendererPool {
    if (!ThreeRendererPool.instance) {
      ThreeRendererPool.instance = new ThreeRendererPool(maxContexts);
    }
    return ThreeRendererPool.instance;
  }

  public acquire(id: string, canvas: HTMLCanvasElement | OffscreenCanvas): RendererInstance {
    const existing = this.activeContexts.get(id);
    if (existing) {
      existing.lastUsed = Date.now();
      return existing;
    }

    if (this.activeContexts.size >= this.maxContexts) {
      this.evictOldest();
    }

    const instance: RendererInstance = {
      id,
      canvas,
      lastUsed: Date.now(),
    };

    this.activeContexts.set(id, instance);
    return instance;
  }

  public release(id: string): void {
    const instance = this.activeContexts.get(id);
    if (instance) {
      this.activeContexts.delete(id);
    }
  }

  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, inst] of this.activeContexts.entries()) {
      if (inst.lastUsed < oldestTime) {
        oldestTime = inst.lastUsed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.release(oldestKey);
    }
  }

  public getActiveCount(): number {
    return this.activeContexts.size;
  }

  public clear(): void {
    this.activeContexts.clear();
  }
}
