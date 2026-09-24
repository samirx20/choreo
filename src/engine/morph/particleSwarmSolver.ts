/**
 * particleSwarmSolver.ts — Deterministic O(1) Particle Swarm & Transition Solver
 *
 * Implements analytical second-order closed-form trajectories for cross-element morphing:
 * - Stardust (cosmic starburst & harmonic swarm with luminous comet trails)
 * - Liquid (viscous gooey organic metaball flow that stretches and fuses)
 * - Voronoi (crystalline shard detachment, 3D tumbling & magnetic snap)
 * - Laser (high-energy electric neon tracer beams & lightning arcs)
 * - Singularity (gravitational implosion, hyper-speed transfer beam & shockwave burst)
 * - Spline (flowing Bezier vector streamlines & animated light ribbons)
 *
 * Rule 4 compliance: Fully closed-form f(t). Zero Euler numerical integration drift.
 * Completely scrubbable forward and backward.
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
 * Deterministic pseudo-random float in [0, 1) based on integer seed
 */
export function hash(seed: number): number {
  const s = Math.sin(seed * 127.1 + 311.7) * 43758.5453123;
  return s - Math.floor(s);
}

/**
 * Samples a point on the perimeter of an ElementBounds box
 */
function samplePointOnBounds(
  bounds: ElementBounds,
  index: number,
  total: number,
  seedOffset: number
): { x: number; y: number } {
  const p1 = hash(index * 3 + seedOffset);
  const perimeterPos = (index / total + p1 * 0.05) % 1;
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
 * Samples true contour points from any layer geometry (Star, Arrow, Line, Circle, Polygon, Card, Text)
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

    // If arrow, reserve last 18% of points for the arrowhead wings
    if (isArrow && index > total * 0.82) {
      const wingIdx = index % 2;
      const wingFrac = (index - total * 0.82) / Math.max(1, total * 0.18);
      const wingAngle = wingIdx === 0 ? Math.PI / 5.5 : -Math.PI / 5.5;
      const cosA = Math.cos(wingAngle);
      const sinA = Math.sin(wingAngle);
      const wingDirX = -ux * cosA - nx * sinA;
      const wingDirY = -uy * cosA - ny * sinA;
      const headLen = Math.min(32, Math.max(16, len * 0.25));
      return {
        x: p2.x + wingDirX * headLen * wingFrac,
        y: p2.y + wingDirY * headLen * wingFrac,
      };
    }

    const t = index / Math.max(1, isArrow ? total * 0.82 : total);
    const jitter = (hash(index * 5 + seedOffset) - 0.5) * 2;
    return {
      x: p1.x + dx * t + nx * jitter,
      y: p1.y + dy * t + ny * jitter,
    };
  }

  // 2. Star
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
    const edgeT = ((index / totalVertices) % 1) * 0.85 + hash(index * 7 + seedOffset) * 0.15;
    return {
      x: v1.x + (v2.x - v1.x) * edgeT,
      y: v1.y + (v2.y - v1.y) * edgeT,
    };
  }

  // 3. Circle / Ellipse
  if (shapeType === "circle" || shapeType === "ellipse") {
    const rx = W / 2;
    const ry = H / 2;
    const angle = (index / total) * Math.PI * 2 + hash(index * 7 + seedOffset) * 0.04;
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
 * applying layer rotation in world space.
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
    const rad = (layer.style.rotation * Math.PI) / 180;
    const cosR = Math.cos(rad);
    const sinR = Math.sin(rad);
    const dx = pt.x - bounds.centerX;
    const dy = pt.y - bounds.centerY;
    return {
      x: bounds.centerX + dx * cosR - dy * sinR,
      y: bounds.centerY + dx * sinR + dy * cosR,
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
  const numVertices = 3 + Math.floor(hash(seed * 11) * 3); // 3 to 5 vertices
  const points: [number, number][] = [];
  for (let i = 0; i < numVertices; i++) {
    const angle = (i / numVertices) * Math.PI * 2 + (hash(seed * 13 + i) - 0.5) * 0.4;
    const r = (size / 2) * (0.6 + 0.4 * hash(seed * 17 + i));
    points.push([Math.cos(angle) * r, Math.sin(angle) * r]);
  }
  return `M ${points.map((p) => `${p[0]!.toFixed(1)},${p[1]!.toFixed(1)}`).join(" L ")} Z`;
}

/**
 * Solves deterministic particle states at normalized progress t in [0, 1]
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
    sourceColor = "#7c3aed",
    targetColor = "#3b82f6",
    sourceLayer,
    targetLayer,
  } = options;

  const count = Math.max(16, Math.min(300, particleCount));
  const t = Math.max(0, Math.min(1, progress));
  const chaosFactor = Math.max(0, Math.min(100, chaos)) / 100;

  const particles: MorphParticle[] = [];

  for (let i = 0; i < count; i++) {
    // 1. Deterministic contour point sampling from true shape geometry
    const pStart = samplePointOnLayer(sourceLayer, source, i, count, 101);
    const pEnd = samplePointOnLayer(targetLayer, target, i, count, 202);

    // 2. Individual stagger and speed per particle
    const staggerWindow = 0.25;
    const particleStagger = hash(i * 19) * staggerWindow;
    const durationFraction = 1.0 - staggerWindow;
    const localProgress = Math.max(
      0,
      Math.min(1, (t - particleStagger) / durationFraction)
    );

    // Smooth cubic ease for progress
    const easeT =
      localProgress < 0.5
        ? 4 * localProgress * localProgress * localProgress
        : 1 - Math.pow(-2 * localProgress + 2, 3) / 2;

    // 3. Style-specific trajectory and physics
    let posX = 0;
    let posY = 0;
    let scale = 1;
    let rotation = 0;
    let opacity = 0;
    let stretchX = 1;
    let stretchY = 1;
    let tailX: number | undefined;
    let tailY: number | undefined;
    let streamPath: string | undefined;
    let finalShape: MorphParticleShape | "shard" = particleShape;
    let shardPath: string | undefined;

    const angleSeed = hash(i * 31) * Math.PI * 2;
    const freqSeed = 2 + hash(i * 41) * 3;
    const ampSeed = (20 + hash(i * 53) * 60) * chaosFactor;

    switch (morphStyle) {
      case "singularity": {
        // Gravitational collapse, relativistic beam streak & shockwave burst
        if (easeT < 0.35) {
          // Phase 1: Inward gravitational spiral suction into source center
          const subT = easeT / 0.35;
          const spiralAngle = angleSeed + (1 - subT) * Math.PI * 3;
          const dist = Math.hypot(pStart.x - source.centerX, pStart.y - source.centerY) * (1 - subT);
          posX = source.centerX + Math.cos(spiralAngle) * dist;
          posY = source.centerY + Math.sin(spiralAngle) * dist;
          scale = Math.max(0.2, 1 - subT * 0.7);
          opacity = 0.6 + 0.4 * subT;
        } else if (easeT < 0.65) {
          // Phase 2: Relativistic hyper-speed transfer beam
          const subT = (easeT - 0.35) / 0.3;
          posX = source.centerX + (target.centerX - source.centerX) * subT;
          posY = source.centerY + (target.centerY - source.centerY) * subT;
          scale = 0.4 + 0.3 * Math.sin(subT * Math.PI);
          opacity = 1;
          stretchX = 3.5;
          stretchY = 0.4;
          rotation = (Math.atan2(target.centerY - source.centerY, target.centerX - source.centerX) * 180) / Math.PI;
        } else {
          // Phase 3: High-energy shockwave explosion outwards to target contour
          const subT = (easeT - 0.65) / 0.35;
          posX = target.centerX + (pEnd.x - target.centerX) * subT;
          posY = target.centerY + (pEnd.y - target.centerY) * subT;
          scale = 0.3 + 0.7 * subT;
          opacity = 0.7 + 0.3 * subT;
        }
        break;
      }

      case "voronoi": {
        // Crystalline shards with 3D tumble and magnetic snap
        finalShape = "shard";
        shardPath = generateShardPath(i, 22);
        const directX = pStart.x + (pEnd.x - pStart.x) * easeT;
        const directY = pStart.y + (pEnd.y - pStart.y) * easeT;
        // Lateral arc explosion settling into target
        const arcY = -Math.sin(easeT * Math.PI) * (25 + ampSeed * 1.2);
        const arcX = Math.cos(angleSeed) * Math.sin(easeT * Math.PI) * (20 + ampSeed);

        posX = directX + arcX;
        posY = directY + arcY;
        // 3D spin settling to 0 at arrival
        rotation = (i * 30 + (1 - easeT) * 540 * (hash(i * 7) > 0.5 ? 1 : -1)) % 360;
        stretchX = 0.8 + 0.4 * Math.sin(easeT * Math.PI * 3);
        scale = 0.8 + 0.4 * Math.sin(easeT * Math.PI);
        opacity = 0.85 + 0.15 * Math.sin(easeT * Math.PI);
        break;
      }

      case "liquid": {
        // Viscous gooey metaball droplets that stretch and fuse
        const directX = pStart.x + (pEnd.x - pStart.x) * easeT;
        const directY = pStart.y + (pEnd.y - pStart.y) * easeT;
        const fluidWave = Math.sin(easeT * Math.PI * 2 + angleSeed) * (15 + ampSeed * 0.5);

        posX = directX + Math.sin(angleSeed) * fluidWave;
        posY = directY + Math.cos(angleSeed) * fluidWave;

        const flightSpeed = Math.sin(easeT * Math.PI);
        stretchX = 1 + flightSpeed * 1.3;
        stretchY = Math.max(0.4, 1 - flightSpeed * 0.4);
        scale = 1.3 + 0.8 * flightSpeed;
        opacity = 0.9 + 0.1 * flightSpeed;
        rotation = (Math.atan2(pEnd.y - pStart.y, pEnd.x - pStart.x) * 180) / Math.PI;
        break;
      }

      case "laser": {
        // High-voltage electric neon tracer beams
        const directX = pStart.x + (pEnd.x - pStart.x) * easeT;
        const directY = pStart.y + (pEnd.y - pStart.y) * easeT;
        const jitter = Math.sin(easeT * 35 + i * 5) * (4 * chaosFactor);

        posX = directX + jitter;
        posY = directY + jitter;

        const beamSpan = 0.22;
        const bStartT = Math.max(0, easeT - beamSpan);
        tailX = pStart.x + (pEnd.x - pStart.x) * bStartT;
        tailY = pStart.y + (pEnd.y - pStart.y) * bStartT;

        scale = 0.8 + 0.5 * Math.sin(easeT * Math.PI);
        opacity = 0.8 + 0.2 * Math.sin(easeT * Math.PI);
        rotation = (Math.atan2(pEnd.y - pStart.y, pEnd.x - pStart.x) * 180) / Math.PI;
        break;
      }

      case "spline": {
        // Flowing Bezier streamlines and ribbons
        const midX = (pStart.x + pEnd.x) / 2 + Math.cos(angleSeed) * (30 + ampSeed * 0.5);
        const midY = Math.min(pStart.y, pEnd.y) - (35 + ampSeed * 0.7);
        const oneMinusT = 1 - easeT;

        posX = oneMinusT * oneMinusT * pStart.x + 2 * oneMinusT * easeT * midX + easeT * easeT * pEnd.x;
        posY = oneMinusT * oneMinusT * pStart.y + 2 * oneMinusT * easeT * midY + easeT * easeT * pEnd.y;

        streamPath = `M ${pStart.x.toFixed(1)},${pStart.y.toFixed(1)} Q ${midX.toFixed(1)},${midY.toFixed(1)} ${pEnd.x.toFixed(1)},${pEnd.y.toFixed(1)}`;
        scale = 0.7 + 0.5 * Math.sin(easeT * Math.PI);
        opacity = 0.8 + 0.2 * Math.sin(easeT * Math.PI);
        rotation = easeT * 180;
        break;
      }

      case "stardust":
      default: {
        // Cosmic stardust with sparkling embers and comet tails
        const directX = pStart.x + (pEnd.x - pStart.x) * easeT;
        const directY = pStart.y + (pEnd.y - pStart.y) * easeT;
        const harmonic = Math.sin(easeT * Math.PI * freqSeed + angleSeed) * (18 + ampSeed * 0.6);
        const lift = -Math.sin(easeT * Math.PI) * (20 + ampSeed * 0.4);

        posX = directX + Math.cos(angleSeed) * harmonic;
        posY = directY + lift + Math.sin(angleSeed) * (harmonic * 0.4);

        // Luminous comet tail
        tailX = posX - (pEnd.x - pStart.x) * 0.07 - Math.cos(angleSeed) * harmonic * 0.2;
        tailY = posY - (pEnd.y - pStart.y) * 0.07 - lift * 0.2;

        scale = 0.8 + 0.5 * Math.sin(easeT * Math.PI);
        opacity = 0.85 + 0.15 * Math.sin(easeT * Math.PI);
        rotation = (i * 36 + easeT * 360) % 360;
        break;
      }
    }

    const particleColor = interpolateColor(sourceColor, targetColor, easeT);

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
      stretchX,
      stretchY,
      tailX,
      tailY,
      streamPath,
    });
  }

  return particles;
}
