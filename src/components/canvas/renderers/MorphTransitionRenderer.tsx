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
        {/* 1. Stardust & Standard Soft Glow */}
        <filter id="morph-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* 2. Liquid Metaball Fusion (Goo Filter) */}
        <filter id="liquid-goo">
          <feGaussianBlur in="SourceGraphic" stdDeviation="7" result="blur" />
          <feColorMatrix
            in="blur"
            mode="matrix"
            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -9"
            result="goo"
          />
          <feComposite in="SourceGraphic" in2="goo" operator="atop" />
        </filter>

        {/* 3. High-Voltage Laser Neon Glow */}
        <filter id="laser-glow" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" result="sharpGlow" />
          <feGaussianBlur in="SourceGraphic" stdDeviation="5.0" result="wideGlow" />
          <feMerge>
            <feMergeNode in="wideGlow" />
            <feMergeNode in="sharpGlow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* 4. Gravitational Singularity Core */}
        <filter id="singularity-core" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="coreBlur" />
          <feMerge>
            <feMergeNode in="coreBlur" />
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
            sourceLayer: morph.sourceLayer,
            targetLayer: morph.targetLayer,
          }
        );

        // 1. LIQUID STYLE: Rendered under SVG metaball fusion filter
        if (morph.morphStyle === "liquid") {
          return (
            <g key={`morph-${mIdx}`} filter="url(#liquid-goo)">
              {particles.map((p) => {
                if (p.opacity <= 0.01) return null;
                const baseR = 14;
                const transform = `translate(${p.x}, ${p.y}) rotate(${p.rotation}) scale(${p.scale * p.stretchX}, ${p.scale * p.stretchY})`;
                return (
                  <ellipse
                    key={p.id}
                    cx={0}
                    cy={0}
                    rx={baseR}
                    ry={baseR * 0.75}
                    fill={p.color}
                    opacity={p.opacity}
                    transform={transform}
                  />
                );
              })}
            </g>
          );
        }

        // 2. LASER STYLE: High-voltage neon tracer beams & electric corona
        if (morph.morphStyle === "laser") {
          return (
            <g key={`morph-${mIdx}`} filter="url(#laser-glow)">
              {/* Laser tracer streak beams */}
              {particles.map((p) => {
                if (p.opacity <= 0.01) return null;
                if (p.tailX === undefined || p.tailY === undefined) return null;
                return (
                  <g key={`beam-${p.id}`}>
                    {/* Outer neon glow beam */}
                    <line
                      x1={p.tailX}
                      y1={p.tailY}
                      x2={p.x}
                      y2={p.y}
                      stroke={p.color}
                      strokeWidth={Math.max(2, p.scale * 3.8)}
                      strokeLinecap="round"
                      opacity={p.opacity * 0.85}
                    />
                    {/* Inner hot white core line */}
                    <line
                      x1={p.tailX}
                      y1={p.tailY}
                      x2={p.x}
                      y2={p.y}
                      stroke="#ffffff"
                      strokeWidth={Math.max(1, p.scale * 1.5)}
                      strokeLinecap="round"
                      opacity={p.opacity}
                    />
                  </g>
                );
              })}

              {/* Laser sparks at leading edge */}
              {particles.map((p) => {
                if (p.opacity <= 0.01) return null;
                return (
                  <circle
                    key={`spark-${p.id}`}
                    cx={p.x}
                    cy={p.y}
                    r={Math.max(2, p.scale * 3)}
                    fill="#ffffff"
                    opacity={p.opacity}
                  />
                );
              })}
            </g>
          );
        }

        // 3. SINGULARITY STYLE: Gravitational implosion vortex, transfer streak & shockwave
        if (morph.morphStyle === "singularity") {
          const pr = morph.progress;
          const maxSourceDim = Math.max(sourceBounds.width, sourceBounds.height);
          const maxTargetDim = Math.max(targetBounds.width, targetBounds.height);

          return (
            <g key={`morph-${mIdx}`} filter="url(#singularity-core)">
              {/* Phase 1: Inward gravitational collapsing ring at source center */}
              {pr < 0.35 && (
                <circle
                  cx={sourceBounds.centerX}
                  cy={sourceBounds.centerY}
                  r={Math.max(4, (1 - pr / 0.35) * maxSourceDim * 0.6)}
                  fill="none"
                  stroke={sourceColor}
                  strokeWidth={2.5}
                  opacity={(1 - pr / 0.35) * 0.8}
                />
              )}

              {/* Phase 2: Relativistic hyper-speed transfer core streak */}
              {pr >= 0.35 && pr < 0.65 && (
                <g>
                  <line
                    x1={sourceBounds.centerX}
                    y1={sourceBounds.centerY}
                    x2={targetBounds.centerX}
                    y2={targetBounds.centerY}
                    stroke={sourceColor}
                    strokeWidth={5}
                    strokeLinecap="round"
                    opacity={0.7}
                  />
                  <line
                    x1={sourceBounds.centerX}
                    y1={sourceBounds.centerY}
                    x2={targetBounds.centerX}
                    y2={targetBounds.centerY}
                    stroke="#ffffff"
                    strokeWidth={2}
                    strokeLinecap="round"
                    opacity={1}
                  />
                </g>
              )}

              {/* Phase 3: Outward expanding shockwave ring at target center */}
              {pr >= 0.65 && (
                <circle
                  cx={targetBounds.centerX}
                  cy={targetBounds.centerY}
                  r={Math.max(4, ((pr - 0.65) / 0.35) * maxTargetDim * 0.75)}
                  fill="none"
                  stroke={targetColor}
                  strokeWidth={3}
                  opacity={(1 - (pr - 0.65) / 0.35) * 0.85}
                />
              )}

              {/* Plasma particles */}
              {particles.map((p) => {
                if (p.opacity <= 0.01) return null;
                const transform = `translate(${p.x}, ${p.y}) rotate(${p.rotation}) scale(${p.scale * p.stretchX}, ${p.scale * p.stretchY})`;
                return (
                  <g key={p.id} transform={transform}>
                    <circle cx={0} cy={0} r={4.5} fill={p.color} opacity={p.opacity} />
                    <circle cx={0} cy={0} r={2} fill="#ffffff" opacity={p.opacity} />
                  </g>
                );
              })}
            </g>
          );
        }

        // 4. SPLINE STYLE: Flowing vector streamlines and gliding light nodes
        if (morph.morphStyle === "spline") {
          return (
            <g key={`morph-${mIdx}`} filter="url(#morph-glow)">
              {/* Flowing animated streamlines */}
              {particles.map((p) => {
                if (!p.streamPath || p.opacity <= 0.01) return null;
                return (
                  <path
                    key={`stream-${p.id}`}
                    d={p.streamPath}
                    fill="none"
                    stroke={p.color}
                    strokeWidth={Math.max(1, p.scale * 2.2)}
                    strokeOpacity={p.opacity * 0.4}
                    strokeDasharray="14 7"
                    strokeDashoffset={-morph.progress * 70}
                    strokeLinecap="round"
                  />
                );
              })}

              {/* Gliding particle nodes */}
              {particles.map((p) => {
                if (p.opacity <= 0.01) return null;
                return (
                  <g key={`node-${p.id}`} transform={`translate(${p.x}, ${p.y})`}>
                    <circle cx={0} cy={0} r={4 * p.scale} fill={p.color} opacity={p.opacity} />
                    <circle cx={0} cy={0} r={1.8 * p.scale} fill="#ffffff" opacity={p.opacity} />
                  </g>
                );
              })}
            </g>
          );
        }

        // 5. VORONOI STYLE: Crystalline glass shards with 3D tumble & white facet highlights
        if (morph.morphStyle === "voronoi") {
          return (
            <g key={`morph-${mIdx}`} filter="url(#morph-glow)">
              {particles.map((p) => {
                if (p.opacity <= 0.01) return null;
                const transform = `translate(${p.x}, ${p.y}) rotate(${p.rotation}) scale(${p.scale * p.stretchX}, ${p.scale * p.stretchY})`;
                return (
                  <g key={p.id} transform={transform}>
                    {p.shardPath ? (
                      <path
                        d={p.shardPath}
                        fill={p.color}
                        stroke="rgba(255, 255, 255, 0.75)"
                        strokeWidth={1.2}
                        opacity={p.opacity}
                      />
                    ) : (
                      <rect
                        x={-5}
                        y={-5}
                        width={10}
                        height={10}
                        fill={p.color}
                        stroke="rgba(255, 255, 255, 0.75)"
                        strokeWidth={1}
                        opacity={p.opacity}
                      />
                    )}
                  </g>
                );
              })}
            </g>
          );
        }

        // 6. STARDUST STYLE (Default): Cosmic starburst with luminous comet tails
        return (
          <g key={`morph-${mIdx}`} filter="url(#morph-glow)">
            {/* Luminous comet tails */}
            {particles.map((p) => {
              if (p.opacity <= 0.01 || p.tailX === undefined || p.tailY === undefined) {
                return null;
              }
              return (
                <line
                  key={`tail-${p.id}`}
                  x1={p.tailX}
                  y1={p.tailY}
                  x2={p.x}
                  y2={p.y}
                  stroke={p.color}
                  strokeWidth={Math.max(1, p.scale * 2.2)}
                  strokeOpacity={p.opacity * 0.55}
                  strokeLinecap="round"
                />
              );
            })}

            {/* Glowing sparkle stars & ember cores */}
            {particles.map((p) => {
              if (p.opacity <= 0.01) return null;
              const baseSize = 8;
              const transform = `translate(${p.x}, ${p.y}) rotate(${p.rotation}) scale(${p.scale * p.stretchX}, ${p.scale * p.stretchY})`;

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
                const s = baseSize * 1.2;
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

              // Circle / ember dot
              return (
                <g key={p.id} transform={transform}>
                  <circle
                    cx={0}
                    cy={0}
                    r={baseSize / 2}
                    fill={p.color}
                    opacity={p.opacity}
                  />
                  <circle cx={0} cy={0} r={1.4} fill="#ffffff" opacity={p.opacity} />
                </g>
              );
            })}
          </g>
        );
      })}
    </svg>
  );
};
