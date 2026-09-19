/**
 * Scoped Video Engine: Decoder, Keyframe Index, Tile Cache & Scrub Controller
 * Provides frame-accurate scrubbing (< 4ms keyframe, debounced exact settle)
 * and sliding-window tile caching for video layers.
 */

import { VideoLayer } from '@/types/scene';

/**
 * Presentation Timestamp (PTS) binary search index for O(log K) instantaneous keyframe lookup.
 */
export class KeyframeIndex {
  private timestamps: number[] = [];
  public complete: boolean = false;

  constructor(initialTimestamps?: number[]) {
    if (initialTimestamps && initialTimestamps.length > 0) {
      this.timestamps = [...initialTimestamps].sort((a, b) => a - b);
      this.complete = true;
    }
  }

  public setTimestamps(timestamps: number[]): void {
    this.timestamps = [...timestamps].sort((a, b) => a - b);
    this.complete = true;
  }

  public getTimestamps(): readonly number[] {
    return this.timestamps;
  }

  /**
   * Returns presentation timestamp of the nearest preceding keyframe <= targetSeconds.
   */
  public floor(seconds: number): number | null {
    const arr = this.timestamps;
    const len = arr.length;
    if (len === 0 || seconds < arr[0]) return null;

    let low = 0;
    let high = len - 1;

    while (low < high) {
      const mid = (low + high + 1) >> 1;
      if (arr[mid] <= seconds) {
        low = mid;
      } else {
        high = mid - 1;
      }
    }

    return arr[low];
  }
}

export interface TileMetadata {
  tileIndex: number;
  frameIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Sliding-window tile cache layout engine.
 * Computes memory budgets, 2D tile atlas layout coordinates, and nearest-neighbor frame lookups.
 */
export class FrameCache {
  public readonly pixelBudget: number;
  public readonly maxTiles: number;
  private tiles: Map<number, TileMetadata> = new Map();
  public columns: number = 9;
  public rows: number = 9;
  public tileWidth: number = 128;
  public tileHeight: number = 72;

  constructor(config?: { pixelBudget?: number; maxTiles?: number }) {
    this.pixelBudget = config?.pixelBudget ?? 768 * 432 * 81; // ~26.8M pixels
    this.maxTiles = config?.maxTiles ?? 81;
  }

  public configureAtlas(frameWidth: number, frameHeight: number): void {
    const fw = Math.max(1, frameWidth);
    const fh = Math.max(1, frameHeight);
    const scale = Math.min(1.0, 720 / Math.max(fw, fh));
    this.tileWidth = Math.max(32, Math.floor(fw * scale));
    this.tileHeight = Math.max(18, Math.floor(fh * scale));

    const tilePixels = this.tileWidth * this.tileHeight;
    const fitCount = Math.max(16, Math.min(this.maxTiles, Math.floor(this.pixelBudget / tilePixels)));
    this.columns = Math.ceil(Math.sqrt(fitCount));
    this.rows = Math.ceil(fitCount / this.columns);
  }

  public insertTile(frameIndex: number): TileMetadata {
    if (this.tiles.has(frameIndex)) {
      return this.tiles.get(frameIndex)!;
    }

    const freeSlot = this.tiles.size % (this.columns * this.rows);
    const x = (freeSlot % this.columns) * this.tileWidth;
    const y = Math.floor(freeSlot / this.columns) * this.tileHeight;

    const metadata: TileMetadata = {
      tileIndex: freeSlot,
      frameIndex,
      x,
      y,
      width: this.tileWidth,
      height: this.tileHeight,
    };

    // If cache exceeds capacity, evict oldest
    if (this.tiles.size >= this.maxTiles) {
      const oldest = this.tiles.keys().next().value;
      if (oldest !== undefined) this.tiles.delete(oldest);
    }

    this.tiles.set(frameIndex, metadata);
    return metadata;
  }

  public has(frameIndex: number): boolean {
    return this.tiles.has(frameIndex);
  }

  public get(frameIndex: number): TileMetadata | undefined {
    return this.tiles.get(frameIndex);
  }

  /**
   * Finds the closest cached frame within a given frame tolerance.
   */
  public findNearest(frameIndex: number, tolerance: number = 4): TileMetadata | undefined {
    if (this.tiles.has(frameIndex)) {
      return this.tiles.get(frameIndex);
    }

    let bestDist = tolerance + 1;
    let bestTile: TileMetadata | undefined;

    for (const [idx, tile] of this.tiles.entries()) {
      const dist = Math.abs(idx - frameIndex);
      if (dist < bestDist) {
        bestDist = dist;
        bestTile = tile;
      }
    }

    return bestTile;
  }

  public clear(): void {
    this.tiles.clear();
  }

  public size(): number {
    return this.tiles.size;
  }
}

export type ScrubMode = 'rapid_scrub' | 'exact_settle';

export interface ScrubState {
  currentFrame: number;
  displayFrame: number;
  mode: ScrubMode;
  targetKeyframe: number | null;
}

/**
 * Controller managing rapid keyframe preview vs debounced exact frame settle.
 */
export class VideoScrubController {
  private currentFrame = -1;
  private displayFrame = -1;
  private lastSeekAt = -Infinity;
  private mode: ScrubMode = 'exact_settle';
  private settleTimer: ReturnType<typeof setTimeout> | null = null;

  public readonly SCRUB_EVENT_WINDOW_MS = 250;
  public readonly SCRUB_SETTLE_MS = 120;
  public readonly FORWARD_BIAS_FRAMES = 24;

  constructor(
    private keyframes: KeyframeIndex,
    private fps = 60,
    private onModeChange?: (state: ScrubState) => void
  ) {}

  public seek(targetFrame: number, now = performance.now()): ScrubState {
    const isConsecutive = now - this.lastSeekAt < this.SCRUB_EVENT_WINDOW_MS;
    const isLargeJump = Math.abs(targetFrame - this.currentFrame) > this.FORWARD_BIAS_FRAMES;
    this.lastSeekAt = now;
    this.currentFrame = targetFrame;

    if (isConsecutive && isLargeJump) {
      // Rapid Scrub: snap to nearest keyframe
      const targetSecs = targetFrame / this.fps;
      const keyPTS = this.keyframes.floor(targetSecs);
      const keyFrame = keyPTS !== null ? Math.round(keyPTS * this.fps) : targetFrame;

      this.mode = 'rapid_scrub';
      this.displayFrame = keyFrame;

      this.scheduleSettle(targetFrame);

      const state: ScrubState = {
        currentFrame: this.currentFrame,
        displayFrame: this.displayFrame,
        mode: this.mode,
        targetKeyframe: keyFrame,
      };
      this.onModeChange?.(state);
      return state;
    }

    // Direct exact seek
    this.mode = 'exact_settle';
    this.displayFrame = targetFrame;
    if (this.settleTimer) {
      clearTimeout(this.settleTimer);
      this.settleTimer = null;
    }

    const state: ScrubState = {
      currentFrame: this.currentFrame,
      displayFrame: this.displayFrame,
      mode: this.mode,
      targetKeyframe: null,
    };
    this.onModeChange?.(state);
    return state;
  }

  private scheduleSettle(targetFrame: number): void {
    if (this.settleTimer) clearTimeout(this.settleTimer);
    this.settleTimer = setTimeout(() => {
      this.settleTimer = null;
      this.mode = 'exact_settle';
      this.displayFrame = targetFrame;
      this.onModeChange?.({
        currentFrame: this.currentFrame,
        displayFrame: this.displayFrame,
        mode: this.mode,
        targetKeyframe: null,
      });
    }, this.SCRUB_SETTLE_MS);
  }

  public getState(): ScrubState {
    return {
      currentFrame: this.currentFrame,
      displayFrame: this.displayFrame,
      mode: this.mode,
      targetKeyframe: null,
    };
  }

  public dispose(): void {
    if (this.settleTimer) {
      clearTimeout(this.settleTimer);
      this.settleTimer = null;
    }
  }
}

/**
 * Derives source media timestamp and frame index from master playhead time.
 */
export function computeSourceTimeAndFrame(
  timelineTime: number,
  layer: VideoLayer,
  fps = 60
): { isActive: boolean; sourceTime: number; frameIndex: number } {
  const delta = timelineTime - layer.start;
  const isActive = delta >= 0 && delta < layer.duration;

  if (!isActive) {
    return {
      isActive: false,
      sourceTime: layer.sourceIn,
      frameIndex: Math.round(layer.sourceIn * fps),
    };
  }

  const rate = layer.playbackRate || 1.0;
  const sourceTime = layer.sourceIn + delta * rate;
  const frameIndex = Math.round(sourceTime * fps);

  return {
    isActive: true,
    sourceTime,
    frameIndex,
  };
}
