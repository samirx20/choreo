/**
 * Razor Cut Tool Implementation
 * Slices video or graphic layers at playhead time into two contiguous clips
 * with sub-frame accuracy, exact source trimming offsets, and normalized IDs.
 */

import { Layer, VideoLayer, GroupLayer } from '@/types/scene';

export interface RazorSplitResult {
  updatedLayers: Layer[];
  headClipId: string | null;
  tailClipId: string | null;
  didSplit: boolean;
}

/**
 * Splits a target layer at the specified playhead timestamp into two contiguous segments.
 */
export function splitLayerAtPlayhead(
  layers: Layer[],
  targetLayerId: string,
  playheadTime: number,
  generateId = (base: string, suffix: string) => `${base}_${suffix}_${Date.now()}`
): RazorSplitResult {
  let headClipId: string | null = null;
  let tailClipId: string | null = null;
  let didSplit = false;

  function traverse(list: Layer[]): Layer[] {
    const result: Layer[] = [];

    for (const layer of list) {
      if (layer.id === targetLayerId) {
        // Compute layer temporal window
        const start = layer.type === 'video' ? (layer as VideoLayer).start : (layer.animation?.in?.start ?? 0);
        const duration =
          layer.type === 'video'
            ? (layer as VideoLayer).duration
            : (layer.animation?.in?.duration ?? 5.0);
        const end = start + duration;
        const delta = playheadTime - start;

        // Ensure playhead strictly intersects the layer interior (at least 0.05s from edges)
        if (delta > 0.05 && delta < duration - 0.05) {
          didSplit = true;

          if (layer.type === 'video') {
            const vLayer = layer as VideoLayer;
            const rate = vLayer.playbackRate || 1.0;
            const sourceSplit = vLayer.sourceIn + delta * rate;

            const clipAId = generateId(vLayer.id, 'head');
            const clipBId = generateId(vLayer.id, 'tail');
            headClipId = clipAId;
            tailClipId = clipBId;

            const clipA: VideoLayer = {
              ...vLayer,
              id: clipAId,
              name: `${vLayer.name} (Part 1)`,
              start: vLayer.start,
              duration: delta,
              sourceIn: vLayer.sourceIn,
              sourceOut: sourceSplit,
            };

            const clipB: VideoLayer = {
              ...vLayer,
              id: clipBId,
              name: `${vLayer.name} (Part 2)`,
              start: playheadTime,
              duration: vLayer.duration - delta,
              sourceIn: sourceSplit,
              sourceOut: vLayer.sourceOut,
            };

            result.push(clipA, clipB);
            continue;
          } else {
            // General graphic / text / shape layer split
            const clipAId = generateId(layer.id, 'head');
            const clipBId = generateId(layer.id, 'tail');
            headClipId = clipAId;
            tailClipId = clipBId;

            const clipA: Layer = {
              ...layer,
              id: clipAId,
              name: `${layer.name} (Part 1)`,
              animation: layer.animation
                ? {
                    ...layer.animation,
                    in: layer.animation.in
                      ? {
                          ...layer.animation.in,
                          duration: Math.min(layer.animation.in.duration, delta),
                        }
                      : undefined,
                  }
                : undefined,
            };

            const clipB: Layer = {
              ...layer,
              id: clipBId,
              name: `${layer.name} (Part 2)`,
              animation: layer.animation
                ? {
                    ...layer.animation,
                    in: layer.animation.in
                      ? {
                          ...layer.animation.in,
                          start: playheadTime,
                          duration: Math.max(0.1, duration - delta),
                        }
                      : undefined,
                  }
                : undefined,
            };

            result.push(clipA, clipB);
            continue;
          }
        }
      }

      if (layer.type === 'group' && (layer as GroupLayer).children) {
        result.push({
          ...layer,
          children: traverse((layer as GroupLayer).children),
        } as GroupLayer);
      } else {
        result.push(layer);
      }
    }

    return result;
  }

  const updatedLayers = traverse(layers);
  return {
    updatedLayers,
    headClipId,
    tailClipId,
    didSplit,
  };
}
