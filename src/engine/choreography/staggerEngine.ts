import { Layer, AnimationClip, EasingType } from "@/types/scene";

export type StaggerOrder =
  | "left-to-right"
  | "right-to-left"
  | "top-to-bottom"
  | "bottom-to-top"
  | "center-out"
  | "edges-in"
  | "layer-order"
  | "reverse-layer-order"
  | "random";

export interface StaggerConfig {
  interval: number; // Delay between consecutive elements in seconds, e.g. 0.06
  order: StaggerOrder;
  baseStartTime?: number; // Start time of first element (defaults to earliest start or 0)
  syncPreset?: string; // Optional: uniform entrance preset (e.g. 'pop', 'slideUp', 'fadeIn')
  syncDuration?: number; // Optional duration for uniform preset in seconds (e.g. 0.5)
  syncEasing?: EasingType; // Optional easing curve
}

export interface LayerStaggerSummary {
  layerId: string;
  orderIndex: number;
  originalStart: number;
  newStart: number;
  delta: number;
}

/**
 * Computes the 2D visual center point of a layer on the canvas.
 */
export function getLayerCenter(layer: Layer): { x: number; y: number } {
  const x = typeof layer.style?.x === "number" ? layer.style.x : parseFloat(String(layer.style?.x || 0)) || 0;
  const y = typeof layer.style?.y === "number" ? layer.style.y : parseFloat(String(layer.style?.y || 0)) || 0;
  const widthVal = layer.style?.width;
  const heightVal = layer.style?.height;
  const width = typeof widthVal === "number" ? widthVal : parseFloat(String(widthVal || 0)) || 0;
  const height = typeof heightVal === "number" ? heightVal : parseFloat(String(heightVal || 0)) || 0;
  return {
    x: x + width / 2,
    y: y + height / 2,
  };
}

/**
 * Computes the collective geometric centroid of a set of layers.
 */
export function getCentroid(layers: Layer[]): { x: number; y: number } {
  if (layers.length === 0) return { x: 0, y: 0 };
  let sumX = 0;
  let sumY = 0;
  for (const l of layers) {
    const c = getLayerCenter(l);
    sumX += c.x;
    sumY += c.y;
  }
  return {
    x: sumX / layers.length,
    y: sumY / layers.length,
  };
}

/**
 * Finds the earliest clip start time across a set of layers.
 */
export function getEarliestStartTime(layers: Layer[]): number {
  let minTime = Infinity;
  for (const l of layers) {
    const clips = l.animation?.clips;
    if (clips && clips.length > 0) {
      for (const c of clips) {
        if (typeof c.start === "number" && c.start < minTime) {
          minTime = c.start;
        }
      }
    } else if (l.animation?.in && typeof l.animation.in.start === "number") {
      if (l.animation.in.start < minTime) {
        minTime = l.animation.in.start;
      }
    }
  }
  return minTime === Infinity ? 0 : Math.max(0, Math.round(minTime * 1000) / 1000);
}

/**
 * Deterministic string hash for consistent random shuffling.
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

/**
 * Sorts layers according to the requested spatial or hierarchical StaggerOrder.
 */
export function sortLayersForStagger(layers: Layer[], order: StaggerOrder): Layer[] {
  const copy = [...layers];
  if (order === "layer-order") return copy;
  if (order === "reverse-layer-order") return copy.reverse();

  if (order === "left-to-right") {
    return copy.sort((a, b) => getLayerCenter(a).x - getLayerCenter(b).x);
  }
  if (order === "right-to-left") {
    return copy.sort((a, b) => getLayerCenter(b).x - getLayerCenter(a).x);
  }
  if (order === "top-to-bottom") {
    return copy.sort((a, b) => getLayerCenter(a).y - getLayerCenter(b).y);
  }
  if (order === "bottom-to-top") {
    return copy.sort((a, b) => getLayerCenter(b).y - getLayerCenter(a).y);
  }
  if (order === "center-out" || order === "edges-in") {
    const centroid = getCentroid(layers);
    const dist = (l: Layer) => {
      const c = getLayerCenter(l);
      const dx = c.x - centroid.x;
      const dy = c.y - centroid.y;
      return Math.sqrt(dx * dx + dy * dy);
    };
    return copy.sort((a, b) =>
      order === "center-out" ? dist(a) - dist(b) : dist(b) - dist(a)
    );
  }
  if (order === "random") {
    return copy.sort((a, b) => hashString(a.id) - hashString(b.id));
  }
  return copy;
}

/**
 * Recalculates and applies staggered timing across an array of layers.
 * Preserves each layer's internal choreography (In -> Action -> Out spacing)
 * while shifting its entry timestamp to create a fluid, cohesive cascade.
 */
export function staggerLayers(
  layers: Layer[],
  config: StaggerConfig
): { updatedLayers: Layer[]; summaries: LayerStaggerSummary[] } {
  if (layers.length === 0) {
    return { updatedLayers: [], summaries: [] };
  }

  const sorted = sortLayersForStagger(layers, config.order);
  const baseStart =
    typeof config.baseStartTime === "number"
      ? config.baseStartTime
      : getEarliestStartTime(layers);

  const summaries: LayerStaggerSummary[] = [];
  const updatedMap = new Map<string, Layer>();

  sorted.forEach((layer, index) => {
    const targetStart = Math.max(
      0,
      Math.round((baseStart + index * config.interval) * 1000) / 1000
    );

    const existingClips = layer.animation?.clips ? [...layer.animation.clips] : [];
    let originalStart = 0;
    let delta = 0;

    let updatedClips: AnimationClip[] = [];
    let updatedInClip: AnimationClip | undefined = undefined;

    if (existingClips.length > 0) {
      // Find the primary entry clip (either explicit 'in' or the earliest start)
      let primaryClipIndex = existingClips.findIndex((c) => c.type === "in");
      if (primaryClipIndex === -1) {
        let earliestIdx = 0;
        let earliestTime = existingClips[0].start;
        for (let i = 1; i < existingClips.length; i++) {
          if (existingClips[i].start < earliestTime) {
            earliestTime = existingClips[i].start;
            earliestIdx = i;
          }
        }
        primaryClipIndex = earliestIdx;
      }

      originalStart = existingClips[primaryClipIndex].start;
      delta = targetStart - originalStart;

      // Shift all clips by the delta so internal multi-clip gaps remain intact
      updatedClips = existingClips.map((c, i) => {
        const shiftedStart = Math.max(
          0,
          Math.round((c.start + delta) * 1000) / 1000
        );

        if (i === primaryClipIndex && config.syncPreset) {
          const syncedDuration =
            typeof config.syncDuration === "number" ? config.syncDuration : c.duration;
          const syncedEasing = config.syncEasing || c.easing || "snappy";

          return {
            ...c,
            start: shiftedStart,
            preset: config.syncPreset,
            duration: syncedDuration,
            easing: syncedEasing,
            type: "in" as const,
          };
        }

        return {
          ...c,
          start: shiftedStart,
        };
      });

      const inClipCandidate = updatedClips.find((c) => c.type === "in");
      updatedInClip = inClipCandidate || updatedClips[0];
    } else {
      // Layer has no animation clips yet; construct an entrance clip
      originalStart = 0;
      delta = targetStart;

      const newClipId = `clip_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const preset = config.syncPreset || "slideUp";
      const duration = typeof config.syncDuration === "number" ? config.syncDuration : 0.5;
      const easing = config.syncEasing || "snappy";

      const createdClip: AnimationClip = {
        id: newClipId,
        name: preset,
        type: "in",
        preset,
        start: targetStart,
        duration,
        easing,
        distance: 40,
        scaleAmount: 1.15,
      };

      updatedClips = [createdClip];
      updatedInClip = createdClip;
    }

    summaries.push({
      layerId: layer.id,
      orderIndex: index,
      originalStart,
      newStart: targetStart,
      delta,
    });

    const updatedLayer: Layer = {
      ...layer,
      animation: {
        ...(layer.animation || {}),
        in: updatedInClip,
        clips: updatedClips,
      },
    };

    updatedMap.set(layer.id, updatedLayer);
  });

  // Preserve the original ordering in the returned array while mapping updated layers
  const updatedLayers = layers.map((l) => updatedMap.get(l.id) || l);

  return { updatedLayers, summaries };
}
