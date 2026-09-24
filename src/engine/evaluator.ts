import React from "react";
import {
  Layer,
  GroupLayer,
  CounterLayer,
} from "@/types/scene";
import { compileTransform } from "./atomics";
import { resolveSceneBindings } from "./bindings/dependencyEngine";

// Re-export sub-evaluators and utilities
export { quantizeTime } from "./evaluator/quantizeTime";
export { evaluateCounterValue } from "./evaluator/counterEvaluator";
export { evaluateAnimationConfig, evaluateKeyframeTrack } from "./evaluator/configEvaluator";
export {
  evaluateClipDelta,
  compoundLayerAnimations,
  type EvaluatedDelta,
} from "./evaluator/clipEvaluator";

import { evaluateCounterValue } from "./evaluator/counterEvaluator";
import { evaluateAnimationConfig, evaluateKeyframeTrack } from "./evaluator/configEvaluator";
import { compoundLayerAnimations } from "./evaluator/clipEvaluator";

export interface ComputedFrameStyles {
  [layerId: string]: React.CSSProperties;
}

/**
 * Deterministically evaluates all layers at timestamp t.
 */
export function evaluateSceneAtTime(
  layers: Layer[],
  currentTime: number,
  groupStartOffset = 0,
  sceneStepFps?: "smooth" | number
): ComputedFrameStyles {
  const result: ComputedFrameStyles = {};

  for (let i = 0; i < layers.length; i++) {
    const layer = layers[i];
    const css: React.CSSProperties = {};

    if (layer.animation) {
      // Modern Multi-Clip evaluation when clips array is populated or has trim animation presets
      if (
        (layer.animation.clips && layer.animation.clips.length > 0) ||
        layer.animation.in?.preset === "drawOn" ||
        layer.animation.in?.preset === "trimPath"
      ) {
        const compounded = compoundLayerAnimations(
          layer,
          currentTime,
          groupStartOffset,
          sceneStepFps
        );
        css.opacity = compounded.opacity;
        const transformStr = compileTransform(compounded.transform);
        if (transformStr) {
          css.transform = transformStr;
        }
        if (compounded.filter) {
          css.filter = compounded.filter;
        }
        if (compounded.clipPath) {
          css.clipPath = compounded.clipPath;
        }
        if (compounded.backgroundColor) {
          css.backgroundColor = compounded.backgroundColor;
        }
        if (compounded.color) {
          css.color = compounded.color;
        }
        if (compounded.borderRadius) {
          css.borderRadius = compounded.borderRadius;
        }
        if (compounded.borderWidth) {
          css.borderWidth = compounded.borderWidth;
          css.borderStyle = "solid";
        }
        if (compounded.borderColor) {
          css.borderColor = compounded.borderColor;
        }
        if (compounded.boxShadow) {
          css.boxShadow = compounded.boxShadow;
        }
        if (compounded.backdropFilter) {
          css.backdropFilter = compounded.backdropFilter;
          css.WebkitBackdropFilter = compounded.backdropFilter;
        }
        if (compounded.widthDelta !== undefined && typeof layer.style.width === "number") {
          css.width = `${Math.max(0, layer.style.width + compounded.widthDelta)}px`;
        }
        if (compounded.heightDelta !== undefined && typeof layer.style.height === "number") {
          css.height = `${Math.max(0, layer.style.height + compounded.heightDelta)}px`;
        }
        if (compounded.trimStart !== undefined) {
          (css as any).trimStart = compounded.trimStart;
        }
        if (compounded.trimEnd !== undefined) {
          (css as any).trimEnd = compounded.trimEnd;
        }
        if (compounded.trimOffset !== undefined) {
          (css as any).trimOffset = compounded.trimOffset;
        }
      } else {
        // Legacy single-slot In animation
        if (layer.animation.in) {
          const anim = layer.animation.in;
          if (
            (layer.type === "text" || layer.type === "chunk") &&
            (anim.animateBy === "word" || anim.animateBy === "character")
          ) {
            // Word-by-word or character-by-character animation is rendered on inner spans in TextRenderer
            css.opacity = 1;
          } else {
            const adjustedStart = anim.start + groupStartOffset;
            const evaluated = evaluateAnimationConfig(
              { ...anim, start: adjustedStart },
              currentTime,
              "in"
            );

            css.opacity = evaluated.opacity;
            const transformStr = compileTransform(evaluated.transform);
            if (transformStr) {
              css.transform = transformStr;
            }
            if (evaluated.filter) {
              css.filter = evaluated.filter;
            }
            if (evaluated.clipPath) {
              css.clipPath = evaluated.clipPath;
            }
          }
        }

        // Emphasis animation (looping/continuous oscillation)
        if (layer.animation.emphasis) {
          const emp = layer.animation.emphasis;
          const empStart = emp.start + groupStartOffset;
          if (currentTime >= empStart) {
            const elapsed = currentTime - empStart;
            const dur = Math.max(emp.duration || 1.0, 0.05);
            const phase = (elapsed % dur) / dur; // 0..1
            const pingPong = phase < 0.5 ? phase * 2 : (1 - phase) * 2; // 0..1..0
            const params = emp.params || {};

            if (emp.preset === "pulse") {
              const scaleDelta = (params.scale ?? 0.15) * pingPong;
              css.transform = `${css.transform ? css.transform + " " : ""}scale(${(1 + scaleDelta).toFixed(3)})`;
            } else if (emp.preset === "bounce") {
              const yDelta = -(params.distance ?? 20) * pingPong;
              css.transform = `${css.transform ? css.transform + " " : ""}translateY(${yDelta.toFixed(2)}px)`;
            } else if (emp.preset === "wiggle" || emp.preset === "shake") {
              const angle = (pingPong * 2 - 1) * (params.angle ?? 8);
              css.transform = `${css.transform ? css.transform + " " : ""}rotate(${angle.toFixed(2)}deg)`;
            } else if (emp.preset === "flash" || emp.preset === "blink") {
              const amount = params.amount ?? 0.7;
              const currentOpacity = typeof css.opacity === "number" ? css.opacity : 1;
              css.opacity = currentOpacity * (1 - amount * pingPong);
            } else if (emp.preset === "spin") {
              const rot = phase * 360;
              css.transform = `${css.transform ? css.transform + " " : ""}rotate(${rot.toFixed(2)}deg)`;
            } else if (emp.preset === "heartbeat") {
              const beat1 = Math.exp(-Math.pow((phase - 0.15) * 20, 2)) * 0.2;
              const beat2 = Math.exp(-Math.pow((phase - 0.35) * 20, 2)) * 0.15;
              const scale = 1 + (beat1 + beat2) * (params.scale ?? 1);
              css.transform = `${css.transform ? css.transform + " " : ""}scale(${scale.toFixed(3)})`;
            }
          }
        }

        // Out animation
        if (layer.animation.out) {
          const anim = layer.animation.out;
          if (
            (layer.type === "text" || layer.type === "chunk") &&
            (anim.animateBy === "word" || anim.animateBy === "character")
          ) {
            css.opacity = 1;
          } else {
            const adjustedStart = anim.start + groupStartOffset;
            if (currentTime >= adjustedStart) {
              const evaluated = evaluateAnimationConfig(
                { ...anim, start: adjustedStart },
                currentTime,
                "out"
              );
              css.opacity = evaluated.opacity;
              const transformStr = compileTransform(evaluated.transform);
              if (transformStr) {
                css.transform = transformStr;
              }
              if (evaluated.filter) {
                css.filter = evaluated.filter;
              }
              if (evaluated.clipPath) {
                css.clipPath = evaluated.clipPath;
              }
            }
          }
        }
      }

      // Discrete keyframe tracks
      if (layer.animation.tracks && layer.animation.tracks.length > 0) {
        for (const track of layer.animation.tracks) {
          const val = evaluateKeyframeTrack(track, currentTime - groupStartOffset);
          if (val !== undefined) {
            if (track.property === "x") {
              css.transform = `${css.transform ? css.transform + " " : ""}translateX(${val}px)`;
            } else if (track.property === "y") {
              css.transform = `${css.transform ? css.transform + " " : ""}translateY(${val}px)`;
            } else if (
              track.property === "scale" ||
              track.property === "scaleX" ||
              track.property === "scaleY"
            ) {
              css.transform = `${css.transform ? css.transform + " " : ""}scale(${val})`;
            } else if (track.property === "rotation" || track.property === "rotate") {
              css.transform = `${css.transform ? css.transform + " " : ""}rotate(${val}deg)`;
            } else if (track.property === "opacity") {
              css.opacity = Number(val);
            } else if (track.property === "blur" || track.property === "filterBlur") {
              css.filter = `blur(${val}px)`;
            } else if (track.property === "backgroundColor") {
              css.backgroundColor = String(val);
            } else if (track.property === "color") {
              css.color = String(val);
            }
          }
        }
      }
    }

    // Counter Layer numerical interpolation
    if (layer.type === "counter") {
      const counterLayer = layer as CounterLayer;
      const formatted = evaluateCounterValue(counterLayer, currentTime, groupStartOffset);
      (counterLayer as any).renderedValue = formatted;
      (counterLayer as any).content = formatted;
    }

    // Static Scale X & Scale Y transforms (e.g. Flips or Volume Squashes)
    if (layer.style.scaleX !== undefined || layer.style.scaleY !== undefined) {
      const sx = layer.style.scaleX ?? 1;
      const sy = layer.style.scaleY ?? 1;
      if (sx !== 1 || sy !== 1) {
        css.transform = `${css.transform ? css.transform + " " : ""}scale(${sx}, ${sy})`;
      }
    }

    // Blend Modes
    if (layer.style.blendMode && layer.style.blendMode !== "normal") {
      css.mixBlendMode = layer.style.blendMode as any;
    }

    // Typography styles
    if (layer.style.fontStyle) css.fontStyle = layer.style.fontStyle;
    if (layer.style.textDecoration) css.textDecoration = layer.style.textDecoration;
    if (layer.style.tracking !== undefined) css.letterSpacing = `${layer.style.tracking / 1000}em`;
    if (layer.style.leading !== undefined) css.lineHeight = `${layer.style.leading}px`;

    // Polar Coordinate Drop Shadow
    if (layer.style.shadowAngle !== undefined && layer.style.shadowDistance !== undefined) {
      const rad = (layer.style.shadowAngle * Math.PI) / 180;
      const dist = layer.style.shadowDistance;
      const dx = Math.cos(rad) * dist;
      const dy = Math.sin(rad) * dist;
      const blur = layer.style.shadowBlur ?? 8;
      const spread = layer.style.shadowSpread ?? 0;
      const col = layer.style.shadowColor ?? "#000000";
      const alpha = layer.style.shadowOpacity ?? 0.5;
      const alphaHex = Math.max(0, Math.min(255, Math.round(alpha * 255)))
        .toString(16)
        .padStart(2, "0");
      css.boxShadow = `${dx.toFixed(1)}px ${dy.toFixed(1)}px ${blur}px ${spread}px ${col}${alphaHex}`;
    } else if (
      layer.style.elevation &&
      layer.style.elevation > 0 &&
      (!layer.style.shadows || layer.style.shadows.length === 0)
    ) {
      // 2.5D Elevation Dynamic Ground Shadow
      const Z = layer.style.elevation;
      const y1 = (Z * 0.25).toFixed(1);
      const blur1 = (Z * 0.2 + 2).toFixed(1);
      const alpha1 = (0.45 * Math.exp(-Z / 80)).toFixed(2);
      const y2 = (Z * 0.7).toFixed(1);
      const blur2 = (Z * 1.4 + 8).toFixed(1);
      const alpha2 = (0.25 / (1 + Z * 0.015)).toFixed(2);
      css.boxShadow = `0px ${y1}px ${blur1}px rgba(0,0,0,${alpha1}), 0px ${y2}px ${blur2}px rgba(0,0,0,${alpha2})`;
    }

    result[layer.id] = css;

    // Evaluate children recursively with cascade stagger
    if (layer.type === "group" || layer.type === "frame") {
      const containerLayer = layer as GroupLayer | any;
      const children: Layer[] = containerLayer.children || [];
      // Double-Stagger Fix: If children already have explicit positive start times baked into the AST,
      // do not double-add the cascade stagger offset.
      const hasExplicitChildStarts = children.some(
        (c: Layer, idx: number) => idx > 0 && (c.animation?.in?.start || 0) > 0
      );
      const stagger =
        containerLayer.autoLink && !hasExplicitChildStarts
          ? containerLayer.staggerDelay ?? 0.15
          : 0;
      const groupStart = layer.animation?.in?.start ?? 0;

      for (let c = 0; c < children.length; c++) {
        const child = children[c];
        const childCascadeOffset = groupStartOffset + groupStart + c * stagger;
        const childResults = evaluateSceneAtTime(
          [child],
          currentTime,
          childCascadeOffset,
          sceneStepFps
        );
        Object.assign(result, childResults);
      }
    }
  }

  if (groupStartOffset === 0) {
    return resolveSceneBindings(layers, result, currentTime);
  }

  return result;
}
