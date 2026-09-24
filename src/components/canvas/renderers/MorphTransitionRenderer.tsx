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
    (layer.style as any).borderColor &&
    typeof (layer.style as any).borderColor === "string" &&
    (layer.style as any).borderColor !== "transparent"
  ) {
    return (layer.style as any).borderColor;
  }
  if (
    (layer.style as any).strokeColor &&
    typeof (layer.style as any).strokeColor === "string" &&
    (layer.style as any).strokeColor !== "transparent"
  ) {
    return (layer.style as any).strokeColor;
  }
  if (
    (layer.style as any).backgroundColor &&
    typeof (layer.style as any).backgroundColor === "string" &&
    (layer.style as any).backgroundColor !== "transparent"
  ) {
    return (layer.style as any).backgroundColor;
  }
  if (layer.style.color && typeof layer.style.color === "string") {
    return layer.style.color;
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
        {/* Soft glowing aura */}
        <filter id="morph-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Liquid Metaball Fusion (Goo Filter) */}
        <filter id="liquid-goo">
          <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
          <feColorMatrix
            in="blur"
            mode="matrix"
            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -9"
            result="goo"
          />
          <feComposite in="SourceGraphic" in2="goo" operator="atop" />
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
            sourceLayer: morph.sourceLayer,
            targetLayer: morph.targetLayer,
          }
        );

        const filterUrl = morph.morphStyle === "liquid" ? "url(#liquid-goo)" : "url(#morph-glow)";
        const baseSize = morph.morphStyle === "liquid" ? 14 : 8;

        return (
          <g key={`morph-${mIdx}`} filter={filterUrl}>
            {particles.map((p) => {
              if (p.opacity <= 0.01 || p.scale <= 0.01) return null;
              const transform = `translate(${p.x}, ${p.y}) rotate(${p.rotation}) scale(${p.scale})`;

              if (p.shape === "shard" && p.shardPath) {
                return (
                  <path
                    key={p.id}
                    d={p.shardPath}
                    fill={p.color}
                    stroke="rgba(255, 255, 255, 0.75)"
                    strokeWidth={1}
                    opacity={p.opacity}
                    transform={transform}
                  />
                );
              }

              if (p.shape === "star") {
                return (
                  <g key={p.id} transform={transform}>
                    <path
                      d={getStarPath(baseSize)}
                      fill={p.color}
                      opacity={p.opacity}
                    />
                    <circle cx={0} cy={0} r={1.5} fill="#ffffff" opacity={p.opacity} />
                  </g>
                );
              }

              if (p.shape === "square") {
                const s = baseSize * 0.9;
                return (
                  <g key={p.id} transform={transform}>
                    <rect
                      x={-s / 2}
                      y={-s / 2}
                      width={s}
                      height={s}
                      rx={2}
                      fill={p.color}
                      opacity={p.opacity}
                    />
                    <circle cx={0} cy={0} r={1.2} fill="#ffffff" opacity={p.opacity} />
                  </g>
                );
              }

              // Standard energy particle: glowing outer halo + white hot core
              return (
                <g key={p.id} transform={transform}>
                  <circle
                    cx={0}
                    cy={0}
                    r={baseSize / 2}
                    fill={p.color}
                    opacity={p.opacity * 0.9}
                  />
                  <circle
                    cx={0}
                    cy={0}
                    r={baseSize / 4}
                    fill="#ffffff"
                    opacity={p.opacity}
                  />
                </g>
              );
            })}
          </g>
        );
      })}
    </svg>
  );
};
