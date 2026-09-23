import React, { useMemo } from "react";
import { Layer, getLayerClips } from "@/types/scene";
import {
  solveParticleSwarm,
  ElementBounds,
  MorphParticle,
} from "@/engine/morph/particleSwarmSolver";
import { MorphStyle, MorphParticleShape } from "@/types/animation";

interface MorphTransitionRendererProps {
  layers: Layer[];
  currentTime: number;
  width: number;
  height: number;
}

/**
 * 4-Point Star SVG Path centered at (0, 0)
 */
function getStarPath(radius: number): string {
  const inner = radius * 0.35;
  return `M 0,${-radius} L ${inner},${-inner} L ${radius},0 L ${inner},${inner} L 0,${radius} L ${-inner},${inner} L ${-radius},0 L ${-inner},${-inner} Z`;
}

function getLayerBounds(layer: Layer): ElementBounds {
  const x = Number(layer.style.x) || 0;
  const y = Number(layer.style.y) || 0;
  const width =
    typeof layer.style.width === "number" && layer.style.width > 0
      ? layer.style.width
      : 160;
  const height =
    typeof layer.style.height === "number" && layer.style.height > 0
      ? layer.style.height
      : 100;
  return {
    x,
    y,
    width,
    height,
    centerX: x + width / 2,
    centerY: y + height / 2,
    borderRadius: (layer.style as any).borderRadius,
  };
}

function getLayerColor(layer: Layer, fallback: string): string {
  if (layer.style.fillColor && typeof layer.style.fillColor === "string") {
    return layer.style.fillColor;
  }
  if (
    (layer.style as any).backgroundColor &&
    typeof (layer.style as any).backgroundColor === "string"
  ) {
    return (layer.style as any).backgroundColor;
  }
  if (layer.style.color && typeof layer.style.color === "string") {
    return layer.style.color;
  }
  if (
    (layer.style as any).strokeColor &&
    typeof (layer.style as any).strokeColor === "string"
  ) {
    return (layer.style as any).strokeColor;
  }
  return fallback;
}

export const MorphTransitionRenderer: React.FC<MorphTransitionRendererProps> = ({
  layers,
  currentTime,
  width,
  height,
}) => {
  // Find all active morph transitions
  const activeMorphs = useMemo(() => {
    const list: {
      sourceLayer: Layer;
      targetLayer: Layer;
      progress: number;
      morphStyle: MorphStyle;
      particleCount: number;
      chaos: number;
      particleShape: MorphParticleShape;
    }[] = [];

    for (const sourceLayer of layers) {
      const clips = getLayerClips(sourceLayer);
      for (const clip of clips) {
        if (clip.preset === "morph" && clip.type === "out" && clip.params?.targetLayerId) {
          const start = clip.start;
          const duration = Math.max(0.1, clip.duration || 0.8);
          if (currentTime >= start && currentTime <= start + duration) {
            const targetLayer = layers.find((l) => l.id === clip.params?.targetLayerId);
            if (targetLayer) {
              const progress = (currentTime - start) / duration;
              list.push({
                sourceLayer,
                targetLayer,
                progress,
                morphStyle: clip.params.morphStyle || "stardust",
                particleCount: clip.params.particleCount ?? 80,
                chaos: clip.params.chaos ?? 30,
                particleShape: clip.params.particleShape || "star",
              });
            }
          }
        }
      }
    }
    return list;
  }, [layers, currentTime]);

  if (activeMorphs.length === 0) return null;

  return (
    <svg
      width={width}
      height={height}
      className="absolute inset-0 pointer-events-none z-30 overflow-visible"
      style={{ width: `${width}px`, height: `${height}px` }}
    >
      <defs>
        <filter id="morph-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {activeMorphs.map((morph, mIdx) => {
        const sourceBounds = getLayerBounds(morph.sourceLayer);
        const targetBounds = getLayerBounds(morph.targetLayer);
        const sourceColor = getLayerColor(morph.sourceLayer, "#7c3aed");
        const targetColor = getLayerColor(morph.targetLayer, "#3b82f6");

        const particles: MorphParticle[] = solveParticleSwarm(
          sourceBounds,
          targetBounds,
          morph.progress,
          {
            morphStyle: morph.morphStyle,
            particleCount: morph.particleCount,
            chaos: morph.chaos,
            particleShape: morph.particleShape,
            sourceColor,
            targetColor,
          }
        );

        return (
          <g key={`morph-${mIdx}`} filter="url(#morph-glow)">
            {particles.map((p) => {
              if (p.opacity <= 0.01) return null;
              const baseSize = 8;
              const transform = `translate(${p.x}, ${p.y}) rotate(${p.rotation}) scale(${p.scale * p.stretchX}, ${p.scale * p.stretchY})`;

              if (p.shape === "shard" && p.shardPath) {
                return (
                  <path
                    key={p.id}
                    d={p.shardPath}
                    fill={p.color}
                    opacity={p.opacity}
                    transform={transform}
                  />
                );
              }

              if (p.shape === "star") {
                return (
                  <path
                    key={p.id}
                    d={getStarPath(baseSize)}
                    fill={p.color}
                    opacity={p.opacity}
                    transform={transform}
                  />
                );
              }

              if (p.shape === "square") {
                const s = baseSize * 1.2;
                return (
                  <rect
                    key={p.id}
                    x={-s / 2}
                    y={-s / 2}
                    width={s}
                    height={s}
                    rx={2}
                    fill={p.color}
                    opacity={p.opacity}
                    transform={transform}
                  />
                );
              }

              // Default: circle / dot
              return (
                <circle
                  key={p.id}
                  cx={0}
                  cy={0}
                  r={baseSize / 2}
                  fill={p.color}
                  opacity={p.opacity}
                  transform={transform}
                />
              );
            })}
          </g>
        );
      })}
    </svg>
  );
};
