/**
 * particleSwarmSolver.ts — Deterministic O(1) Particle Swarm & Transition Solver
 *
 * Implements analytical second-order closed-form trajectories for cross-element morphing:
 * - Stardust (cosmic starburst & harmonic swarm)
 * - Liquid (viscous gooey metaball flow)
 * - Voronoi (crystalline shard detachment & magnetic snap)
 * - Laser (wireframe beam unspool & trace)
 * - Singularity (implode to dense micro-core, streak & shockwave burst)
 * - Spline (smooth cubic contour flow)
 *
 * Rule 4 compliance: Fully closed-form f(t). Zero Euler numerical integration drift.
 * Completely scrubbable forward and backward.
 */

import { MorphStyle, MorphParticleShape } from "@/types/animation";

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
}

export interface MorphSolverOptions {
  morphStyle?: MorphStyle;
  particleCount?: number;
  chaos?: number; // 0 to 100
  particleShape?: MorphParticleShape;
  sourceColor?: string;
  targetColor?: string;
}

/**
 * Deterministic pseudo-random float in [0, 1) based on integer seed
 */
function hash(seed: number): number {
  const s = Math.sin(seed * 127.1 + 311.7) * 43758.5453123;
  return s - Math.floor(s);
}

/**
 * Deterministic sample point on or within element bounds
 */
function samplePointOnElement(
  bounds: ElementBounds,
  index: number,
  total: number,
  seedOffset: number
): { x: number; y: number } {
  const p1 = hash(index * 3 + seedOffset);
  const p2 = hash(index * 7 + seedOffset + 42);

  // Distribute 60% on perimeter and 40% in interior
  const isPerimeter = index % 5 < 3;

  if (isPerimeter) {
    const perimeterPos = (index / total + p1 * 0.1) % 1;
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
  } else {
    // Interior point with margin
    const margin = 0.15;
    const x = bounds.x + bounds.width * (margin + (1 - 2 * margin) * p1);
    const y = bounds.y + bounds.height * (margin + (1 - 2 * margin) * p2);
    return { x, y };
  }
}

/**
 * Linear color interpolation between two hex or rgb strings
 */
export function interpolateColor(
  c1: string,
  c2: string,
  factor: number
): string {
  // Fallbacks if not valid hex
  const parseHex = (hex: string): [number, number, number] => {
    if (!hex || !hex.startsWith("#")) return [109, 40, 217]; // default purple
    let h = hex.replace("#", "");
    if (h.length === 3) {
      h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
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
 * Generate a deterministic voronoi shard SVG path around (0, 0)
 */
function generateShardPath(seed: number, size: number): string {
  const numVertices = 3 + Math.floor(hash(seed * 11) * 3); // 3 to 5 vertices
  const points: [number, number][] = [];
  for (let i = 0; i < numVertices; i++) {
    const angle = (i / numVertices) * Math.PI * 2 + (hash(seed * 13 + i) - 0.5) * 0.4;
    const r = (size / 2) * (0.6 + 0.4 * hash(seed * 17 + i));
    points.push([Math.cos(angle) * r, Math.sin(angle) * r]);
  }
  return `M ${points.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" L ")} Z`;
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
    sourceColor = "#6d28d9",
    targetColor = "#3b82f6",
  } = options;

  const count = Math.max(16, Math.min(300, particleCount));
  const t = Math.max(0, Math.min(1, progress));
  const chaosFactor = Math.max(0, Math.min(100, chaos)) / 100;

  const particles: MorphParticle[] = [];

  for (let i = 0; i < count; i++) {
    // 1. Deterministic sample points on source and target
    const pStart = samplePointOnElement(source, i, count, 101);
    const pEnd = samplePointOnElement(target, i, count, 202);

    // 2. Individual stagger and speed per particle
    const staggerWindow = 0.35;
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
    let finalShape: MorphParticleShape | "shard" = particleShape;
    let shardPath: string | undefined;

    const angleSeed = hash(i * 31) * Math.PI * 2;
    const freqSeed = 2 + hash(i * 41) * 3;
    const ampSeed = (20 + hash(i * 53) * 60) * chaosFactor;

    switch (morphStyle) {
      case "singularity": {
        // Phase 1 (0 to 0.35): Implode to source center
        // Phase 2 (0.35 to 0.65): Hyper-streak from source center to target center
        // Phase 3 (0.65 to 1.0): Explode outward to target perimeter
        if (easeT < 0.35) {
          const subT = easeT / 0.35;
          posX = pStart.x + (source.centerX - pStart.x) * subT;
          posY = pStart.y + (source.centerY - pStart.y) * subT;
          scale = 1 - subT * 0.7;
          opacity = 0.2 + 0.8 * subT;
        } else if (easeT < 0.65) {
          const subT = (easeT - 0.35) / 0.3;
          posX = source.centerX + (target.centerX - source.centerX) * subT;
          posY = source.centerY + (target.centerY - source.centerY) * subT;
          scale = 0.3 + 0.2 * Math.sin(subT * Math.PI);
          opacity = 1;
          stretchX = 2.5;
          stretchY = 0.6;
          rotation =
            (Math.atan2(
              target.centerY - source.centerY,
              target.centerX - source.centerX
            ) *
              180) /
            Math.PI;
        } else {
          const subT = (easeT - 0.65) / 0.35;
          posX = target.centerX + (pEnd.x - target.centerX) * subT;
          posY = target.centerY + (pEnd.y - target.centerY) * subT;
          scale = 0.3 + 0.7 * subT;
          opacity = 1 - subT * 0.4;
        }
        break;
      }

      case "voronoi": {
        finalShape = "shard";
        shardPath = generateShardPath(i, 16);
        // Direct flight with rotational turbulence and shard spinning
        const directX = pStart.x + (pEnd.x - pStart.x) * easeT;
        const directY = pStart.y + (pEnd.y - pStart.y) * easeT;
        const arcY = -Math.sin(easeT * Math.PI) * ampSeed * 1.5;
        const arcX = Math.cos(angleSeed) * Math.sin(easeT * Math.PI) * ampSeed;

        posX = directX + arcX;
        posY = directY + arcY;
        rotation = (i * 45 + easeT * 720 * (hash(i * 7) > 0.5 ? 1 : -1)) % 360;
        scale = 0.5 + 0.5 * Math.sin(easeT * Math.PI);
        opacity = Math.sin(easeT * Math.PI) * 0.95;
        break;
      }

      case "liquid": {
        // Metaball stretching along flight vector
        const directX = pStart.x + (pEnd.x - pStart.x) * easeT;
        const directY = pStart.y + (pEnd.y - pStart.y) * easeT;
        const wave = Math.sin(easeT * Math.PI * freqSeed) * ampSeed * 0.5;

        posX = directX + Math.sin(angleSeed) * wave;
        posY = directY + Math.cos(angleSeed) * wave;

        // Stretch during mid-air flight
        const flightSpeed = Math.sin(easeT * Math.PI);
        stretchX = 1 + flightSpeed * 0.8;
        stretchY = Math.max(0.4, 1 - flightSpeed * 0.4);
        scale = 0.8 + 0.6 * flightSpeed;
        opacity = 0.3 + 0.7 * flightSpeed;
        rotation =
          (Math.atan2(pEnd.y - pStart.y, pEnd.x - pStart.x) * 180) / Math.PI;
        break;
      }

      case "laser": {
        // High aspect ratio needle trace
        const directX = pStart.x + (pEnd.x - pStart.x) * easeT;
        const directY = pStart.y + (pEnd.y - pStart.y) * easeT;

        posX = directX;
        posY = directY;
        stretchX = 3.2;
        stretchY = 0.35;
        scale = 0.4 + 0.8 * Math.sin(easeT * Math.PI);
        opacity = Math.sin(easeT * Math.PI);
        rotation =
          (Math.atan2(pEnd.y - pStart.y, pEnd.x - pStart.x) * 180) / Math.PI;
        break;
      }

      case "spline": {
        // Smooth Bezier arc with minimal turbulence
        const midX = (pStart.x + pEnd.x) / 2 + Math.cos(angleSeed) * ampSeed * 0.3;
        const midY =
          Math.min(pStart.y, pEnd.y) - (30 + ampSeed * 0.6); // arc above
        const oneMinusT = 1 - easeT;

        // Quadratic Bezier B(t) = (1-t)^2 P0 + 2(1-t)t P1 + t^2 P2
        posX =
          oneMinusT * oneMinusT * pStart.x +
          2 * oneMinusT * easeT * midX +
          easeT * easeT * pEnd.x;
        posY =
          oneMinusT * oneMinusT * pStart.y +
          2 * oneMinusT * easeT * midY +
          easeT * easeT * pEnd.y;

        scale = 0.5 + 0.6 * Math.sin(easeT * Math.PI);
        opacity = Math.sin(easeT * Math.PI);
        rotation = easeT * 180;
        break;
      }

      case "stardust":
      default: {
        // Harmonic cosmic starburst & swarm
        const directX = pStart.x + (pEnd.x - pStart.x) * easeT;
        const directY = pStart.y + (pEnd.y - pStart.y) * easeT;

        const harmonic =
          Math.sin(easeT * Math.PI * freqSeed + angleSeed) * ampSeed;
        const burstLift = -Math.sin(easeT * Math.PI) * (20 + ampSeed * 0.4);

        posX = directX + Math.cos(angleSeed) * harmonic;
        posY = directY + burstLift + Math.sin(angleSeed) * (harmonic * 0.5);

        // Twinkle scale pulse
        const twinkle = Math.sin(easeT * Math.PI * 8 + i);
        scale = (0.6 + 0.6 * Math.sin(easeT * Math.PI)) * (0.8 + 0.2 * twinkle);
        opacity = Math.sin(easeT * Math.PI) * (0.7 + 0.3 * Math.abs(twinkle));
        rotation = (i * 30 + easeT * 360) % 360;
        break;
      }
    }

    // Color gradient interpolation
    const color = interpolateColor(sourceColor, targetColor, easeT);

    particles.push({
      id: i,
      x: Math.round(posX * 10) / 10,
      y: Math.round(posY * 10) / 10,
      scale: Math.max(0, Math.round(scale * 100) / 100),
      rotation: Math.round(rotation * 10) / 10,
      opacity: Math.max(0, Math.min(1, Math.round(opacity * 100) / 100)),
      color,
      shape: finalShape,
      shardPath,
      stretchX: Math.round(stretchX * 100) / 100,
      stretchY: Math.round(stretchY * 100) / 100,
    });
  }

  return particles;
}
