/**
 * particleSwarmSolver.ts — Deterministic O(1) 4-Phase Physical Morph Swarm Solver
 *
 * Choreographic Architecture:
 * 1. Phase 1 (Breakup, t in [0, 0.20]):
 *    Source element expands slightly (1.0 -> 1.08) and shatters into particles on its contour.
 *    Particles burst outward slightly from the source center, taking over visual ownership.
 *
 * 2. Phase 2 (Swarm Migration, t in [0.20, 0.72]):
 *    The particle swarm travels across the canvas from source to target with natural
 *    flocking momentum and fluid arc waves.
 *
 * 3. Phase 3 (Shape Assembly, t in [0.72, 0.88]):
 *    Particles decelerate onto the exact target contour (arrow shaft, star vertices, circle, etc.),
 *    clearly outlining and forming the second shape on canvas.
 *
 * 4. Phase 4 (Collapse & Fusion, t in [0.88, 1.0]):
 *    Particles collapse inward and fuse into the solid second element as it emerges and settles.
 *
 * Rule 4 compliance: Fully closed-form f(t). Zero Euler numerical integration drift.
 */

import { MorphStyle, MorphParticleShape } from "@/types/animation";
import { Layer } from "@/types/scene";

export interface ElementBounds {
  x: number;
  y: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
  borderRadius?: number;
}

export interface MorphParticle {
  id: number;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  opacity: number;
  color: string;
  shape: MorphParticleShape | "shard";
  shardPath?: string;
  stretchX: number;
  stretchY: number;
  tailX?: number;
  tailY?: number;
  beamStartX?: number;
  beamStartY?: number;
  beamEndX?: number;
  beamEndY?: number;
  streamPath?: string;
}

export interface MorphSolverOptions {
  morphStyle?: MorphStyle;
  particleCount?: number;
  chaos?: number; // 0 to 100
  particleShape?: MorphParticleShape;
  sourceColor?: string;
  targetColor?: string;
  sourceLayer?: Layer;
  targetLayer?: Layer;
}

/**
 * Deterministic PRNG hash function for O(1) analytical evaluation
 */
function hash(n: number): number {
  const sin = Math.sin(n * 12.9898 + 78.233) * 43758.5453123;
  return sin - Math.floor(sin);
}

/**
 * Samples a point along the rectangular boundary of an element
 */
function samplePointOnBounds(
  bounds: ElementBounds,
  index: number,
  total: number,
  seedOffset: number
): { x: number; y: number } {
  const perimeterPos = (index / total + hash(index * 3 + seedOffset) * 0.04) % 1;
  const perimeterLength = 2 * (bounds.width + bounds.height);
  const d = perimeterPos * perimeterLength;

  if (d < bounds.width) {
    return { x: bounds.x + d, y: bounds.y };
  } else if (d < bounds.width + bounds.height) {
    return { x: bounds.x + bounds.width, y: bounds.y + (d - bounds.width) };
  } else if (d < 2 * bounds.width + bounds.height) {
    return {
      x: bounds.x + bounds.width - (d - (bounds.width + bounds.height)),
      y: bounds.y + bounds.height,
    };
  } else {
    return {
      x: bounds.x,
      y: bounds.y + bounds.height - (d - (2 * bounds.width + bounds.height)),
    };
  }
}

/**
 * Samples unrotated raw contour points from layer geometry
 */
function sampleRawPointOnLayer(
  layer: Layer | undefined,
  bounds: ElementBounds,
  index: number,
  total: number,
  seedOffset: number
): { x: number; y: number } {
  if (!layer) {
    return samplePointOnBounds(bounds, index, total, seedOffset);
  }

  const shapeType = (layer as any).shapeType || (layer.type === "polygon" ? "polygon" : layer.type);
  const W = Math.max(1, bounds.width);
  const H = Math.max(1, bounds.height);
  const cx = bounds.centerX;
  const cy = bounds.centerY;

  // 1. Line or Arrow
  if (layer.type === "line" || shapeType === "line" || shapeType === "arrow") {
    const x1 = typeof (layer as any).x1 === "number" ? (layer as any).x1 : 0;
    const y1 = typeof (layer as any).y1 === "number" ? (layer as any).y1 : H / 2;
    const x2 = typeof (layer as any).x2 === "number" ? (layer as any).x2 : W;
    const y2 = typeof (layer as any).y2 === "number" ? (layer as any).y2 : H / 2;

    const p1 = { x: bounds.x + x1, y: bounds.y + y1 };
    const p2 = { x: bounds.x + x2, y: bounds.y + y2 };
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    const nx = -uy;
    const ny = ux;

    const isArrow =
      shapeType === "arrow" ||
      (layer as any).arrowEnd === "arrow" ||
      (layer as any).arrowEnd === true;

    // If arrow, reserve last 20% of points for the arrowhead wings
    if (isArrow && index > total * 0.80) {
      const wingIdx = index % 2;
      const wingFrac = (index - total * 0.80) / Math.max(1, total * 0.20);
      const wingAngle = wingIdx === 0 ? Math.PI / 6 : -Math.PI / 6;
      const cosA = Math.cos(wingAngle);
      const sinA = Math.sin(wingAngle);
      const wingDirX = -ux * cosA - nx * sinA;
      const wingDirY = -uy * cosA - ny * sinA;
      const headLen = Math.min(28, Math.max(14, len * 0.22));
      return {
        x: p2.x + wingDirX * headLen * wingFrac,
        y: p2.y + wingDirY * headLen * wingFrac,
      };
    }

    const t = index / Math.max(1, isArrow ? total * 0.80 : total);
    return {
      x: p1.x + dx * t,
      y: p1.y + dy * t,
    };
  }

  // 2. Star Shape
  if (shapeType === "star") {
    const points = (layer as any).points || 5;
    const innerRatio = (layer as any).innerRadiusRatio || 0.382;
    const totalVertices = points * 2;
    const S = Math.min(W, H) / 100;
    const offsetX = bounds.x + (W - 100 * S) / 2;
    const offsetY = bounds.y + (H - 100 * S) / 2;
    const toX = (px: number) => offsetX + px * S;
    const toY = (py: number) => offsetY + py * S;

    const starCx = 50,
      starCy = 50,
      rOuter = 45,
      rInner = 45 * innerRatio;
    const vertices: { x: number; y: number }[] = [];
    for (let v = 0; v < totalVertices; v++) {
      const r = v % 2 === 0 ? rOuter : rInner;
      const angle = (v * Math.PI) / points - Math.PI / 2;
      vertices.push({
        x: toX(starCx + r * Math.cos(angle)),
        y: toY(starCy + r * Math.sin(angle)),
      });
    }

    const edgeIdx = index % totalVertices;
    const nextIdx = (edgeIdx + 1) % totalVertices;
    const v1 = vertices[edgeIdx]!;
    const v2 = vertices[nextIdx]!;
    const edgeFraction = ((index / totalVertices) * 1.618) % 1;
    return {
      x: v1.x + (v2.x - v1.x) * edgeFraction,
      y: v1.y + (v2.y - v1.y) * edgeFraction,
    };
  }

  // 3. Circle / Ellipse
  if (shapeType === "circle" || shapeType === "ellipse") {
    const rx = W / 2;
    const ry = H / 2;
    const angle = (index / total) * Math.PI * 2;
    return {
      x: cx + rx * Math.cos(angle),
      y: cy + ry * Math.sin(angle),
    };
  }

  // 4. Triangle / Polygon
  if (shapeType === "triangle" || shapeType === "polygon") {
    const sides = shapeType === "triangle" ? 3 : (layer as any).sides || 5;
    const S = Math.min(W, H) / 100;
    const offsetX = bounds.x + (W - 100 * S) / 2;
    const offsetY = bounds.y + (H - 100 * S) / 2;
    const toX = (px: number) => offsetX + px * S;
    const toY = (py: number) => offsetY + py * S;

    const polyCx = 50,
      polyCy = 50,
      r = 45;
    const vertices: { x: number; y: number }[] = [];
    for (let s = 0; s < sides; s++) {
      const angle = (s * 2 * Math.PI) / sides - Math.PI / 2;
      vertices.push({
        x: toX(polyCx + r * Math.cos(angle)),
        y: toY(polyCy + r * Math.sin(angle)),
      });
    }

    const edgeIdx = index % sides;
    const nextIdx = (edgeIdx + 1) % sides;
    const v1 = vertices[edgeIdx]!;
    const v2 = vertices[nextIdx]!;
    const edgeT = ((index / sides) % 1) * 0.85 + hash(index * 7 + seedOffset) * 0.15;
    return {
      x: v1.x + (v2.x - v1.x) * edgeT,
      y: v1.y + (v2.y - v1.y) * edgeT,
    };
  }

  // Default: Rectangle / Card / Text / Image
  return samplePointOnBounds(bounds, index, total, seedOffset);
}

/**
 * Samples true contour points from any layer geometry (Star, Arrow, Line, Circle, Polygon, Card, Text)
 * applying the layer's true transformOrigin / pivot point rotation in world space.
 */
export function samplePointOnLayer(
  layer: Layer | undefined,
  bounds: ElementBounds,
  index: number,
  total: number,
  seedOffset: number
): { x: number; y: number } {
  const pt = sampleRawPointOnLayer(layer, bounds, index, total, seedOffset);
  if (layer?.style?.rotation) {
    const pivotX = typeof layer.style.pivotX === "number" ? layer.style.pivotX : 0.5;
    const pivotY = typeof layer.style.pivotY === "number" ? layer.style.pivotY : 0.5;
    const originX = bounds.x + pivotX * bounds.width;
    const originY = bounds.y + pivotY * bounds.height;

    const rad = (layer.style.rotation * Math.PI) / 180;
    const cosR = Math.cos(rad);
    const sinR = Math.sin(rad);
    const dx = pt.x - originX;
    const dy = pt.y - originY;
    return {
      x: originX + dx * cosR - dy * sinR,
      y: originY + dx * sinR + dy * cosR,
    };
  }
  return pt;
}

/**
 * Linear color interpolation between two hex or rgb strings
 */
export function interpolateColor(c1: string, c2: string, factor: number): string {
  const parseHex = (hex: string): [number, number, number] => {
    if (!hex || !hex.startsWith("#")) return [109, 40, 217];
    let h = hex.replace("#", "");
    if (h.length === 3) {
      h = h[0]! + h[0]! + h[1]! + h[1]! + h[2]! + h[2]!;
    }
    const num = parseInt(h, 16);
    return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
  };

  const rgb1 = parseHex(c1);
  const rgb2 = parseHex(c2);

  const t = Math.max(0, Math.min(1, factor));
  const r = Math.round(rgb1[0] + (rgb2[0] - rgb1[0]) * t);
  const g = Math.round(rgb1[1] + (rgb2[1] - rgb1[1]) * t);
  const b = Math.round(rgb1[2] + (rgb2[2] - rgb1[2]) * t);

  return `rgb(${r}, ${g}, ${b})`;
}

/**
 * Generate a deterministic voronoi crystal shard SVG path around (0, 0)
 */
function generateShardPath(seed: number, size: number): string {
  const numVertices = 3 + Math.floor(hash(seed * 11) * 3);
  const points: [number, number][] = [];
  for (let i = 0; i < numVertices; i++) {
    const angle = (i / numVertices) * Math.PI * 2 + (hash(seed * 13 + i) - 0.5) * 0.4;
    const r = (size / 2) * (0.6 + 0.4 * hash(seed * 17 + i));
    points.push([Math.cos(angle) * r, Math.sin(angle) * r]);
  }
  return `M ${points.map((p) => `${p[0]!.toFixed(1)},${p[1]!.toFixed(1)}`).join(" L ")} Z`;
}

/**
 * Solves deterministic particle states implementing the 4-Phase Physical Morph:
 * Phase 1 [0 <= t < 0.20]: Source expands & breaks into particles along contour
 * Phase 2 [0.20 <= t < 0.72]: Swarm travels across canvas to target position with natural flocking
 * Phase 3 [0.72 <= t < 0.88]: Particles lock onto and clearly form the second shape
 * Phase 4 [0.88 <= t <= 1.0]: Particles collapse inward / fuse into the solid second element
 */
export function solveParticleSwarm(
  source: ElementBounds,
  target: ElementBounds,
  progress: number,
  options: MorphSolverOptions = {}
): MorphParticle[] {
  const {
    morphStyle = "stardust",
    particleCount = 80,
    chaos = 30,
    particleShape = "star",
    sourceColor = "#18181b",
    targetColor = "#71717a",
    sourceLayer,
    targetLayer,
  } = options;

  const count = Math.max(16, Math.min(300, particleCount));
  const t = Math.max(0, Math.min(1, progress));
  const chaosFactor = Math.max(0, Math.min(100, chaos)) / 100;

  const particles: MorphParticle[] = [];

  for (let i = 0; i < count; i++) {
    // 1. Precise contour sampling with full transform-origin rotation invariance
    const pStart = samplePointOnLayer(sourceLayer, source, i, count, 101);
    const pEnd = samplePointOnLayer(targetLayer, target, i, count, 202);

    // Subtle individual particle stagger so they don't move as rigid clones
    const stagger = (hash(i * 19) - 0.5) * 0.05;
    const localT = Math.max(0, Math.min(1, t + stagger));

    // Vector from source center to contour point for outward breakup impulse
    const dxFromSource = pStart.x - source.centerX;
    const dyFromSource = pStart.y - source.centerY;
    const distFromSource = Math.hypot(dxFromSource, dyFromSource) || 1;
    const normSourceX = dxFromSource / distFromSource;
    const normSourceY = dyFromSource / distFromSource;

    // Flight vector from start to end
    const flightX = pEnd.x - pStart.x;
    const flightY = pEnd.y - pStart.y;
    const flightDist = Math.hypot(flightX, flightY) || 1;
    const perpX = -flightY / flightDist;
    const perpY = flightX / flightDist;

    let posX: number;
    let posY: number;
    let scale = 1;
    let opacity = 1;
    let rotation = 0;

    // PHASE 1: Source Expansion & Breakup (t in [0, 0.18])
    if (localT < 0.18) {
      const p1 = localT / 0.18; // 0 to 1
      const burstDist = Math.sin(p1 * Math.PI) * (12 * (1 + chaosFactor * 0.5));
      posX = pStart.x + normSourceX * burstDist;
      posY = pStart.y + normSourceY * burstDist;

      scale = Math.min(1, p1 * 1.8);
      opacity = Math.min(1, p1 * 2.2);
      rotation = i * 36;
    }
    // PHASE 2: Swarm Flight Across Canvas (t in [0.18, 0.82])
    // During this phase, BOTH source and target elements have STRICTLY 0 OPACITY.
    else if (localT < 0.82) {
      const p2 = (localT - 0.18) / 0.64; // 0 to 1
      // Smooth cubic ease for flight
      const flightEase = p2 * p2 * (3 - 2 * p2);

      const baseX = pStart.x + flightX * flightEase;
      const baseY = pStart.y + flightY * flightEase;

      // Natural fluid flocking arc
      const arcAmp = Math.min(50, Math.max(12, flightDist * 0.12)) * (0.6 + chaosFactor * 0.6);
      const arcOffset = (hash(i * 37) - 0.5) * 2 * arcAmp;
      const wave = Math.sin(p2 * Math.PI);

      posX = baseX + perpX * (arcOffset * wave);
      posY = baseY + perpY * (arcOffset * wave);

      scale = 1.0 + Math.sin(p2 * Math.PI) * 0.2;
      opacity = 1.0;
      rotation = (i * 36 + p2 * 360) % 360;
    }
    // PHASE 3: Target Shape Assembly (t in [0.82, 0.90])
    // Particles arrive and lock into the exact target contour while target element is still 0 opacity.
    else if (localT < 0.90) {
      const p3 = (localT - 0.82) / 0.08; // 0 to 1
      // Decelerate and snap cleanly into the target contour position
      const settleEase = 1 - Math.pow(1 - p3, 2);
      const remainingOffset = (1 - settleEase) * 4 * (hash(i * 47) - 0.5);

      posX = pEnd.x + perpX * remainingOffset;
      posY = pEnd.y + perpY * remainingOffset;

      scale = 1.0;
      opacity = 1.0;
      rotation = i * 36;
    }
    // PHASE 4: Collapse & Fusion into Target Element (t in [0.90, 1.0])
    // Particles collapse inward and disappear as the solid target element appears.
    else {
      const p4 = (localT - 0.90) / 0.10; // 0 to 1
      posX = pEnd.x;
      posY = pEnd.y;

      scale = Math.max(0, 1 - p4 * 1.3);
      opacity = Math.max(0, 1 - p4);
      rotation = i * 36;
    }

    const particleColor = interpolateColor(sourceColor, targetColor, localT);
    const finalShape: MorphParticleShape | "shard" = morphStyle === "voronoi" ? "shard" : particleShape;
    const shardPath = finalShape === "shard" ? generateShardPath(i, 20) : undefined;

    particles.push({
      id: i,
      x: posX,
      y: posY,
      scale,
      rotation,
      opacity,
      color: particleColor,
      shape: finalShape,
      shardPath,
      stretchX: 1,
      stretchY: 1,
    });
  }

  return particles;
}
