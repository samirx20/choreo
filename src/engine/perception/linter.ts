/**
 * Scene Structural Linter (Zero-GPU AST Pre-Flight Validator)
 * Executes in < 2ms without GPU allocation to detect 8 critical structural defects:
 * 1. black-frames
 * 2. no-visuals
 * 3. never-visible
 * 4. zero-duration
 * 5. transparent
 * 6. source-error
 * 7. broken-binding
 * 8. stagger-collision
 */

import { Screen, Layer, GroupLayer, ElementLinkBinding } from '@/types/scene';

export type CheckIssueCode =
  | 'black-frames'
  | 'no-visuals'
  | 'never-visible'
  | 'zero-duration'
  | 'transparent'
  | 'source-error'
  | 'broken-binding'
  | 'stagger-collision';

export interface CheckIssue {
  code: CheckIssueCode;
  severity: 'error' | 'warning';
  message: string;
  layerId?: string;
  ranges?: Array<{ start: number; end: number }>;
}

export interface CheckResult {
  stats: {
    nodes: number;
    byKind: Record<string, number>;
    depth: number;
    duration: number;
  };
  issues: CheckIssue[];
  passed: boolean;
}

export type Interval = { start: number; end: number };

/**
 * Determines whether a layer produces visible pixels on the canvas during its active window.
 */
function drawsPixels(layer: Layer): boolean {
  if (layer.hidden) return false;
  if (layer.type === 'group') return false; // Container only; children draw pixels

  // Static opacity 0 without entrance or property tracks
  const hasOpacityAnimation =
    layer.animation?.in?.preset === 'fadeIn' ||
    layer.animation?.tracks?.some((t) => t.property === 'opacity');

  if (layer.style.opacity === 0 && !hasOpacityAnimation) {
    return false;
  }

  return true;
}

/**
 * Finds uncovered gaps in the coverage window down to single-frame precision.
 */
export function findGaps(window: Interval, coverage: Interval[], fps = 60): Interval[] {
  if (coverage.length === 0) {
    return window.end > window.start ? [window] : [];
  }

  const sorted = [...coverage].sort((a, b) => a.start - b.start);
  const gaps: Interval[] = [];
  let cursor = window.start;

  for (const { start, end } of sorted) {
    if (start > cursor) {
      gaps.push({ start: cursor, end: Math.min(start, window.end) });
    }
    cursor = Math.max(cursor, end);
    if (cursor >= window.end) break;
  }

  if (cursor < window.end) {
    gaps.push({ start: cursor, end: window.end });
  }

  // Filter out sub-frame rounding slivers (< 1 / fps)
  const minSpan = 1 / fps;
  return gaps.filter((g) => g.end - g.start >= minSpan);
}

/**
 * Checks if the dependency graph formed by bindings contains cycles (e.g. A -> B -> A).
 */
function findCyclicBindings(layers: Layer[]): string[] {
  const adj = new Map<string, string[]>();

  function collect(list: Layer[]) {
    for (const l of list) {
      if (l.bindings && l.bindings.length > 0) {
        for (const b of l.bindings) {
          if (!adj.has(l.id)) adj.set(l.id, []);
          adj.get(l.id)!.push(b.driverLayerId);
        }
      }
      if (l.type === 'group' && (l as GroupLayer).children) {
        collect((l as GroupLayer).children);
      }
    }
  }
  collect(layers);

  const visited = new Set<string>();
  const inStack = new Set<string>();
  const cyclicNodes = new Set<string>();

  function dfs(node: string) {
    visited.add(node);
    inStack.add(node);

    const neighbors = adj.get(node) ?? [];
    for (const n of neighbors) {
      if (!visited.has(n)) {
        dfs(n);
      } else if (inStack.has(n)) {
        cyclicNodes.add(node);
        cyclicNodes.add(n);
      }
    }

    inStack.delete(node);
  }

  for (const node of adj.keys()) {
    if (!visited.has(node)) {
      dfs(node);
    }
  }

  return Array.from(cyclicNodes);
}

/**
 * Performs a comprehensive AST lint pass over a Screen.
 */
export function lintScreen(screen: Screen, fps = 60): CheckResult {
  const issues: CheckIssue[] = [];
  const coverage: Interval[] = [];
  const byKind: Record<string, number> = {};
  let totalNodes = 0;
  let maxDepth = 0;

  // Build layer lookup index
  const layerMap = new Map<string, Layer>();
  function indexLayers(layers: Layer[]) {
    for (const l of layers) {
      layerMap.set(l.id, l);
      if (l.type === 'group' && (l as GroupLayer).children) {
        indexLayers((l as GroupLayer).children);
      }
    }
  }
  indexLayers(screen.layers);

  // Check cyclic bindings
  const cyclicLayerIds = findCyclicBindings(screen.layers);
  for (const cId of cyclicLayerIds) {
    const l = layerMap.get(cId);
    issues.push({
      code: 'broken-binding',
      severity: 'error',
      layerId: cId,
      message: `Layer "${l?.name ?? cId}" is part of a cyclic dependency loop`,
    });
  }

  function walk(layer: Layer, window: Interval, depth: number) {
    totalNodes++;
    byKind[layer.type] = (byKind[layer.type] ?? 0) + 1;
    if (depth > maxDepth) maxDepth = depth;

    // 1. Broken bindings check
    if (layer.bindings) {
      for (const b of layer.bindings) {
        if (!layerMap.has(b.driverLayerId)) {
          issues.push({
            code: 'broken-binding',
            severity: 'error',
            layerId: layer.id,
            message: `Layer "${layer.name}" references non-existent driver layer "${b.driverLayerId}"`,
          });
        }
      }
    }

    // 2. Static transparency check
    const hasOpacityAnimation =
      layer.animation?.in?.preset === 'fadeIn' ||
      layer.animation?.tracks?.some((t) => t.property === 'opacity');

    if (layer.style.opacity === 0 && !hasOpacityAnimation) {
      issues.push({
        code: 'transparent',
        severity: 'warning',
        layerId: layer.id,
        message: `Layer "${layer.name}" has opacity=0 without animation tracks or presets`,
      });
    }

    // 3. Source error check
    if (layer.type === 'image') {
      const src = (layer as any).src;
      if (!src || typeof src !== 'string' || src.trim() === '') {
        issues.push({
          code: 'source-error',
          severity: 'error',
          layerId: layer.id,
          message: `Image layer "${layer.name}" is missing a valid source URL`,
        });
      }
    }

    // 4. Temporal active span
    const start = layer.animation?.in?.start ?? 0;
    const duration = layer.animation?.in?.duration ?? screen.duration;
    const end = Math.min(screen.duration, start + duration);

    if (duration <= 0) {
      issues.push({
        code: 'zero-duration',
        severity: 'warning',
        layerId: layer.id,
        message: `Layer "${layer.name}" has zero or negative duration (${duration}s)`,
      });
    }

    // 5. Visibility window clipping
    const activeStart = Math.max(window.start, start);
    const activeEnd = Math.min(window.end, end);

    if (activeStart >= activeEnd) {
      issues.push({
        code: 'never-visible',
        severity: 'warning',
        layerId: layer.id,
        message: `Layer "${layer.name}" scheduled outside parent visibility window [${window.start.toFixed(2)}s, ${window.end.toFixed(2)}s]`,
      });
    } else {
      if (drawsPixels(layer)) {
        coverage.push({ start: activeStart, end: activeEnd });
      }
    }

    // 6. Stagger collision check on groups
    if (layer.type === 'group') {
      const group = layer as GroupLayer;
      if (group.autoLink && group.children && group.children.length > 1) {
        // Calculate cumulative stagger end
        let lastChildEnd = 0;
        for (const child of group.children) {
          const cStart = child.animation?.in?.start ?? 0;
          const cDur = child.animation?.in?.duration ?? 0.5;
          const cEnd = cStart + cDur;
          if (cEnd > lastChildEnd) lastChildEnd = cEnd;
        }

        if (lastChildEnd > screen.duration) {
          issues.push({
            code: 'stagger-collision',
            severity: 'warning',
            layerId: group.id,
            message: `Group "${group.name}" cascade stagger extends to ${lastChildEnd.toFixed(2)}s, exceeding screen duration (${screen.duration.toFixed(2)}s)`,
          });
        }
      }

      // Recurse into children
      if (group.children) {
        for (const child of group.children) {
          walk(child, { start: activeStart, end: activeEnd }, depth + 1);
        }
      }
    }
  }

  const screenWindow: Interval = { start: 0, end: screen.duration };
  for (const rootLayer of screen.layers) {
    walk(rootLayer, screenWindow, 1);
  }

  // 7. Check for black frames or completely empty screen
  if (screen.duration > 0) {
    if (coverage.length === 0) {
      issues.push({
        code: 'no-visuals',
        severity: 'error',
        message: `Screen "${screen.name}" contains no visible rendering layers`,
      });
    } else {
      const gaps = findGaps(screenWindow, coverage, fps);
      if (gaps.length > 0) {
        const totalGapDuration = gaps.reduce((sum, g) => sum + (g.end - g.start), 0);
        issues.push({
          code: 'black-frames',
          severity: 'error',
          message: `No visuals scheduled in ${gaps.length} span(s) totaling ${totalGapDuration.toFixed(2)}s — black frames`,
          ranges: gaps,
        });
      }
    }
  }

  const hasErrors = issues.some((i) => i.severity === 'error');

  return {
    stats: {
      nodes: totalNodes,
      byKind,
      depth: maxDepth,
      duration: screen.duration,
    },
    issues,
    passed: !hasErrors,
  };
}
