import React from "react";
import {
  Layer,
  GroupLayer,
  AnimationConfig,
} from "@/types/scene";
import { getEasing } from "./easings";
import {
  defaultTransformState,
  compileTransform,
  TransformState,
  evalMaskInset,
} from "./atomics";

export interface ComputedFrameStyles {
  [layerId: string]: React.CSSProperties;
}

/**
 * Deterministically evaluates CSS properties for an animation config at relative time t.
 */
function evaluateAnimationConfig(
  config: AnimationConfig,
  currentTime: number,
  mode: "in" | "out" = "in"
): {
  active: boolean;
  transform: TransformState;
  opacity: number;
  filter?: string;
  clipPath?: string;
} {
  const { start, duration, preset, easing, bezierPoints, params = {} } = config;
  const easeFn = getEasing(easing, bezierPoints);

  // Check if before start
  if (currentTime < start) {
    if (mode === "in") {
      // Not yet entered: hidden/initial state
      const tState = defaultTransformState();
      let initOpacity = 0;
      let filter: string | undefined;
      let clipPath: string | undefined;

      if (preset === "pop" || preset === "grow") {
        const initScale = params.initialScale ?? (preset === "pop" ? 0 : 0.5);
        tState.scaleX = initScale;
        tState.scaleY = initScale;
      } else if (preset === "shrink") {
        tState.scaleX = 1.5;
        tState.scaleY = 1.5;
      } else if (preset === "slideUp") {
        tState.y = params.distance ?? 60;
      } else if (preset === "slideDown") {
        tState.y = -(params.distance ?? 60);
      } else if (preset === "slideLeft") {
        tState.x = params.distance ?? 80;
      } else if (preset === "slideRight") {
        tState.x = -(params.distance ?? 80);
      } else if (preset === "blurIn") {
        filter = `blur(${params.blurRadius ?? 20}px)`;
      } else if (preset === "spin") {
        tState.rotate = -180;
        tState.scaleX = 0;
        tState.scaleY = 0;
      } else if (preset === "twist") {
        tState.rotate = 30;
        tState.scaleX = 0.7;
        tState.scaleY = 0.7;
      } else if (preset === "flipX") {
        tState.perspective = params.perspective ?? 600;
        tState.rotateX = params.initialAngle ?? 90;
      } else if (preset === "flipY") {
        tState.perspective = params.perspective ?? 600;
        tState.rotateY = params.initialAngle ?? 90;
      } else if (preset === "dropIn") {
        tState.perspective = 800;
        tState.z = 300;
      } else if (preset === "maskWipe") {
        initOpacity = 1;
        clipPath = evalMaskInset(0, params.direction || "up");
      }

      return {
        active: false,
        transform: tState,
        opacity: initOpacity,
        filter,
        clipPath,
      };
    } else {
      // Out animation before start: fully visible resting state
      return {
        active: false,
        transform: defaultTransformState(),
        opacity: 1,
      };
    }
  }

  // Check if finished
  if (currentTime >= start + duration) {
    if (mode === "in") {
      // In animation completed: fully visible resting state
      return {
        active: false,
        transform: defaultTransformState(),
        opacity: 1,
      };
    } else {
      // Out animation completed: exited/hidden
      return {
        active: false,
        transform: defaultTransformState(),
        opacity: 0,
      };
    }
  }

  // Active interpolation
  const rawProgress = (currentTime - start) / Math.max(duration, 0.001);
  const progress = easeFn(Math.min(Math.max(rawProgress, 0), 1));

  const tState = defaultTransformState();
  let opacity = 1;
  let filter: string | undefined;
  let clipPath: string | undefined;

  const effectiveProgress = mode === "in" ? progress : 1 - progress;

  // Preset recipes based on 8 atomic properties
  switch (preset) {
    case "fadeIn":
    case "fadeOut":
      opacity = effectiveProgress;
      break;

    case "slideUp": {
      const dist = params.distance ?? 60;
      tState.y = (1 - effectiveProgress) * dist;
      opacity = effectiveProgress;
      break;
    }

    case "slideDown": {
      const dist = params.distance ?? 60;
      tState.y = -(1 - effectiveProgress) * dist;
      opacity = effectiveProgress;
      break;
    }

    case "slideLeft": {
      const dist = params.distance ?? 80;
      tState.x = (1 - effectiveProgress) * dist;
      opacity = effectiveProgress;
      break;
    }

    case "slideRight": {
      const dist = params.distance ?? 80;
      tState.x = -(1 - effectiveProgress) * dist;
      opacity = effectiveProgress;
      break;
    }

    case "pop": {
      const initialScale = params.initialScale ?? 0;
      const s = initialScale + (1 - initialScale) * effectiveProgress;
      tState.scaleX = s;
      tState.scaleY = s;
      opacity = Math.min(effectiveProgress * 1.5, 1);
      break;
    }

    case "grow": {
      const initialScale = params.initialScale ?? 0.5;
      const s = initialScale + (1 - initialScale) * effectiveProgress;
      tState.scaleX = s;
      tState.scaleY = s;
      opacity = effectiveProgress;
      break;
    }

    case "shrink": {
      const s = 1.5 - 0.5 * effectiveProgress;
      tState.scaleX = s;
      tState.scaleY = s;
      opacity = effectiveProgress;
      break;
    }

    case "spin": {
      tState.rotate = -180 * (1 - effectiveProgress);
      tState.scaleX = effectiveProgress;
      tState.scaleY = effectiveProgress;
      opacity = effectiveProgress;
      break;
    }

    case "twist": {
      const rot = 30 * (1 - effectiveProgress);
      const s = 0.7 + 0.3 * effectiveProgress;
      tState.rotate = rot;
      tState.scaleX = s;
      tState.scaleY = s;
      opacity = effectiveProgress;
      break;
    }

    case "blurIn": {
      const maxBlur = params.blurRadius ?? 20;
      const blur = (1 - effectiveProgress) * maxBlur;
      if (blur > 0.1) {
        filter = `blur(${blur.toFixed(1)}px)`;
      }
      opacity = effectiveProgress;
      break;
    }

    case "flipX": {
      tState.perspective = params.perspective ?? 600;
      tState.rotateX = (1 - effectiveProgress) * (params.initialAngle ?? 90);
      opacity = effectiveProgress;
      break;
    }

    case "flipY": {
      tState.perspective = params.perspective ?? 600;
      tState.rotateY = (1 - effectiveProgress) * (params.initialAngle ?? 90);
      opacity = effectiveProgress;
      break;
    }

    case "dropIn": {
      tState.perspective = 800;
      tState.z = (1 - effectiveProgress) * 300;
      opacity = effectiveProgress;
      break;
    }

    case "maskWipe": {
      clipPath = evalMaskInset(effectiveProgress, params.direction || "up");
      opacity = 1;
      break;
    }

    default:
      opacity = effectiveProgress;
      break;
  }

  return {
    active: true,
    transform: tState,
    opacity,
    filter,
    clipPath,
  };
}

/**
 * Deterministically evaluates all layers at timestamp t.
 */
export function evaluateSceneAtTime(
  layers: Layer[],
  currentTime: number,
  groupStartOffset = 0
): ComputedFrameStyles {
  const result: ComputedFrameStyles = {};

  for (let i = 0; i < layers.length; i++) {
    const layer = layers[i];
    const css: React.CSSProperties = {};

    if (layer.animation) {
      // In animation
      if (layer.animation.in) {
        const anim = layer.animation.in;
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

      // Out animation
      if (layer.animation.out) {
        const anim = layer.animation.out;
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

    result[layer.id] = css;

    // Evaluate children recursively with cascade stagger
    if (layer.type === "group") {
      const groupLayer = layer as GroupLayer;
      const stagger = groupLayer.autoLink ? (groupLayer.staggerDelay ?? 0.15) : 0;
      const groupStart = layer.animation?.in?.start ?? 0;

      for (let c = 0; c < groupLayer.children.length; c++) {
        const child = groupLayer.children[c];
        const childCascadeOffset = groupStartOffset + groupStart + c * stagger;
        const childResults = evaluateSceneAtTime(
          [child],
          currentTime,
          childCascadeOffset
        );
        Object.assign(result, childResults);
      }
    }
  }

  return result;
}
