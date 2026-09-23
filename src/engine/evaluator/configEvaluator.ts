import { AnimationConfig, AnimationTrack } from "@/types/scene";
import { getEasing, evaluateSpring } from "../easings";
import { defaultTransformState, TransformState, evalMaskInset } from "../atomics";
import { quantizeTime } from "./quantizeTime";

/**
 * Deterministically evaluates CSS properties for an animation config at relative time t.
 */
export function evaluateAnimationConfig(
  config: AnimationConfig,
  currentTime: number,
  mode: "in" | "out" = "in",
  inheritedStepFps?: "smooth" | number
): {
  active: boolean;
  transform: TransformState;
  opacity: number;
  filter?: string;
  clipPath?: string;
} {
  const { start, duration, preset, easing, bezierPoints, params = {} } = config;
  const springConfig =
    (config as any).springStiffness || (config as any).springDamping
      ? {
          stiffness: (config as any).springStiffness,
          damping: (config as any).springDamping,
          mass: (config as any).springMass,
        }
      : undefined;
  const easeFn = getEasing(easing, bezierPoints, params.overshootAmount, springConfig);
  const t = quantizeTime(currentTime, config.stepFps ?? inheritedStepFps);

  // Check if before start
  if (t < start) {
    if (mode === "in") {
      // Not yet entered: hidden/initial state
      const tState = defaultTransformState();
      let initOpacity = 0;
      let filter: string | undefined;
      let clipPath: string | undefined;

      const clipDist = config.distance ?? params.distance;
      const clipScale = config.scaleAmount ?? params.scaleAmount;
      const clipRot = config.rotationDegrees ?? params.rotationDegrees;

      if (preset === "pop" || preset === "grow") {
        const initScale = clipScale ?? params.initialScale ?? (preset === "pop" ? 0 : 0.5);
        tState.scaleX = initScale;
        tState.scaleY = initScale;
      } else if (preset === "shrink" || preset === "popOut") {
        const initScale = clipScale ?? 1.5;
        tState.scaleX = initScale;
        tState.scaleY = initScale;
      } else if (params.angle !== undefined && (preset.startsWith("slide") || preset === "polarSlide")) {
        const dist = clipDist ?? 60;
        const rad = (params.angle * Math.PI) / 180;
        tState.x = Math.cos(rad) * dist;
        tState.y = Math.sin(rad) * dist;
      } else if (preset === "slideUp" || (preset === "slide" && (config.direction === "up" || params.direction === "up"))) {
        tState.y = clipDist ?? 60;
      } else if (preset === "slideDown" || (preset === "slide" && (config.direction === "down" || params.direction === "down"))) {
        tState.y = -(clipDist ?? 60);
      } else if (preset === "slideLeft" || (preset === "slide" && (config.direction === "left" || params.direction === "left"))) {
        tState.x = clipDist ?? 80;
      } else if (preset === "slideRight" || (preset === "slide" && (config.direction === "right" || params.direction === "right"))) {
        tState.x = -(clipDist ?? 80);
      } else if (preset === "blurIn") {
        filter = `blur(${params.blurRadius ?? params.blur ?? 20}px)`;
      } else if (preset === "spin") {
        tState.rotate = -(clipRot ?? 180);
        tState.scaleX = 0;
        tState.scaleY = 0;
      } else if (preset === "twist") {
        tState.rotate = clipRot ?? 30;
        tState.scaleX = clipScale ?? 0.7;
        tState.scaleY = clipScale ?? 0.7;
      } else if (preset === "flipX") {
        tState.perspective = params.perspective ?? 600;
        tState.rotateX = params.initialAngle ?? (clipRot ?? 90);
      } else if (preset === "flipY") {
        tState.perspective = params.perspective ?? 600;
        tState.rotateY = params.initialAngle ?? (clipRot ?? 90);
      } else if (preset === "flip3D") {
        tState.perspective = params.perspective ?? 600;
        tState.rotateX = params.initialAngle ?? 60;
        tState.rotateY = -(params.initialAngle ?? 60);
      } else if (preset === "dropIn" || preset === "gravityFall") {
        tState.perspective = 800;
        tState.y = -(clipDist ?? 300);
      } else if (preset === "elasticBounce") {
        tState.scaleX = 0;
        tState.scaleY = 0;
      } else if (preset === "scaleReveal") {
        tState.scaleX = clipScale ?? 0.8;
        tState.scaleY = clipScale ?? 0.8;
        clipPath = "inset(50% 50% 50% 50%)";
      } else if (preset === "circleIris") {
        clipPath = "circle(0% at 50% 50%)";
      } else if (preset === "jellySquash") {
        tState.scaleX = 0.5;
        tState.scaleY = 1.4;
      } else if (preset === "glitchDisintegrate") {
        tState.x = 20;
        clipPath = "inset(30% 0% 30% 0%)";
      } else if (preset === "fade" || preset === "fadeIn") {
        initOpacity = 0;
      } else if (preset === "wipe" || preset === "mask_reveal" || preset === "maskWipe") {
        initOpacity = 1;
        const maskDir = typeof config.direction === "string" && ["up", "down", "left", "right"].includes(config.direction) ? config.direction : (params.direction || "up");
        clipPath = evalMaskInset(0, maskDir as any);
      } else if (preset === "circleReveal") {
        clipPath = `circle(0% at ${params.origin || "50% 50%"})`;
      } else if (preset === "baselineRise" || preset === "baselineReveal") {
        initOpacity = 0;
        tState.y = clipDist ?? 40;
      } else if (preset === "blurFocusPop") {
        filter = `blur(${(params.blurRadius ?? 20).toFixed(1)}px)`;
        tState.scaleX = 0.92;
        tState.scaleY = 0.92;
        initOpacity = 0;
      } else if (preset === "trackingExpansion") {
        tState.scaleX = 0.98;
        tState.scaleY = 0.98;
        initOpacity = 0;
      } else if (preset === "elasticScalePop") {
        tState.scaleX = 0;
        tState.scaleY = 0;
        initOpacity = 0;
      } else if (preset === "textShimmer") {
        initOpacity = 0.3;
      } else if (preset === "wordCascade") {
        tState.y = clipDist ?? 28;
        tState.scaleX = 0.95;
        tState.scaleY = 0.95;
        initOpacity = 0;
      } else if (preset === "lineReveal") {
        tState.y = clipDist ?? 36;
        initOpacity = 0;
      } else if (preset === "highlightDraw") {
        clipPath = "inset(0 100% 0 0)";
        initOpacity = 0;
      } else if (preset === "cardSettlePop") {
        tState.scaleX = 0.88;
        tState.scaleY = 0.88;
        initOpacity = 0;
      } else if (preset === "elevationRise") {
        tState.y = clipDist ?? 24;
        initOpacity = 0;
      } else if (preset === "glassIris") {
        filter = "blur(16px)";
        tState.scaleX = 0.95;
        tState.scaleY = 0.95;
        initOpacity = 0;
      } else if (preset === "kenBurns") {
        tState.scaleX = 1.0;
        tState.scaleY = 1.0;
        initOpacity = 1;
      } else if (preset === "focusPull") {
        filter = `blur(${(params.blurRadius ?? 16).toFixed(1)}px)`;
        tState.scaleX = 1.04;
        tState.scaleY = 1.04;
        initOpacity = 0;
      } else if (preset === "arrowShoot") {
        tState.scaleX = 0;
        initOpacity = 0;
      } else if (preset === "dashFlow") {
        initOpacity = 1;
      } else if (preset === "iconPop") {
        tState.scaleX = 0;
        tState.scaleY = 0;
        tState.rotate = -15;
        initOpacity = 0;
      } else if (preset === "stampSettle") {
        tState.y = -(clipDist ?? 30);
        initOpacity = 0;
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
  if (t >= start + duration) {
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
  const rawProgress = (t - start) / Math.max(duration, 0.001);
  const progress = easeFn(Math.min(Math.max(rawProgress, 0), 1));

  const tState = defaultTransformState();
  let opacity = 1;
  let filter: string | undefined;
  let clipPath: string | undefined;

  const effectiveProgress = mode === "in" ? progress : 1 - progress;
  const clipDist = config.distance ?? params.distance;
  const clipScale = config.scaleAmount ?? params.scaleAmount;
  const clipRot = config.rotationDegrees ?? params.rotationDegrees;
  const allowFade = params.fade !== false;

  // Check polar slide override
  if (params.angle !== undefined && (preset.startsWith("slide") || preset === "polarSlide")) {
    const dist = clipDist ?? 60;
    const rad = (params.angle * Math.PI) / 180;
    tState.x = (1 - effectiveProgress) * Math.cos(rad) * dist;
    tState.y = (1 - effectiveProgress) * Math.sin(rad) * dist;
    opacity = allowFade ? effectiveProgress : 1;
  } else {
    // Preset recipes based on 8 atomic properties
    switch (preset) {
      case "fadeIn":
      case "fadeOut":
      case "fade":
        opacity = effectiveProgress;
        break;

      case "slide":
      case "slideUp":
      case "slideDown":
      case "slideLeft":
      case "slideRight": {
        const dist = clipDist ?? 60;
        const dir =
          config.direction ||
          params.direction ||
          (preset === "slideDown"
            ? "down"
            : preset === "slideLeft"
            ? "left"
            : preset === "slideRight"
            ? "right"
            : "up");
        if (mode === "in") {
          if (dir === "down") tState.y = (-(1 - effectiveProgress) * dist) || 0;
          else if (dir === "left") tState.x = ((1 - effectiveProgress) * dist) || 0;
          else if (dir === "right") tState.x = (-(1 - effectiveProgress) * dist) || 0;
          else tState.y = ((1 - effectiveProgress) * dist) || 0;
          opacity = allowFade ? effectiveProgress : 1;
        } else {
          // Out exit: element slides away in the specified direction
          if (dir === "down") tState.y = ((1 - effectiveProgress) * dist) || 0;
          else if (dir === "left") tState.x = (-(1 - effectiveProgress) * dist) || 0;
          else if (dir === "right") tState.x = ((1 - effectiveProgress) * dist) || 0;
          else tState.y = (-(1 - effectiveProgress) * dist) || 0;
          opacity = allowFade ? effectiveProgress : 1;
        }
        break;
      }

      case "baselineRise":
      case "baselineReveal": {
        const dist = clipDist ?? 40;
        tState.y = (1 - effectiveProgress) * dist;
        opacity = allowFade ? effectiveProgress : 1;
        break;
      }

      case "blurFocusPop": {
        const maxBlur = params.blurRadius ?? 20;
        const blur = (1 - effectiveProgress) * maxBlur;
        if (blur > 0.1) {
          filter = `blur(${blur.toFixed(1)}px)`;
        }
        const s = 0.92 + 0.08 * effectiveProgress;
        tState.scaleX = s;
        tState.scaleY = s;
        opacity = effectiveProgress;
        break;
      }

      case "trackingExpansion": {
        opacity = effectiveProgress;
        const s = 0.98 + 0.02 * effectiveProgress;
        tState.scaleX = s;
        tState.scaleY = s;
        break;
      }

      case "elasticScalePop": {
        const springVal = evaluateSpring(
          effectiveProgress,
          1.0,
          params.stiffness ?? 180,
          params.damping ?? 12
        );
        tState.scaleX = springVal;
        tState.scaleY = springVal;
        opacity = Math.min(effectiveProgress * 1.5, 1);
        break;
      }

      case "textShimmer": {
        const p = effectiveProgress;
        opacity = 0.4 + 0.6 * p;
        const gleam = Math.sin(p * Math.PI);
        if (gleam > 0.05) {
          filter = `brightness(${(1 + gleam * 0.6).toFixed(2)}) drop-shadow(0 0 ${(gleam * 8).toFixed(1)}px rgba(255,255,255,0.8))`;
        }
        break;
      }

      case "wordCascade": {
        const dist = clipDist ?? 28;
        tState.y = (1 - effectiveProgress) * dist;
        const s = 0.95 + 0.05 * effectiveProgress;
        tState.scaleX = s;
        tState.scaleY = s;
        opacity = allowFade ? effectiveProgress : 1;
        break;
      }

      case "lineReveal": {
        const dist = clipDist ?? 36;
        tState.y = (1 - effectiveProgress) * dist;
        opacity = allowFade ? effectiveProgress : 1;
        break;
      }

      case "highlightDraw": {
        const p = effectiveProgress;
        tState.scaleX = 0.95 + 0.05 * p;
        opacity = allowFade ? p : 1;
        clipPath = `inset(0 ${(1 - p) * 100}% 0 0)`;
        break;
      }

      case "cardSettlePop": {
        const springVal = evaluateSpring(
          effectiveProgress,
          1.0,
          params.stiffness ?? 180,
          params.damping ?? 14
        );
        const s = 0.88 + 0.12 * springVal;
        tState.scaleX = s;
        tState.scaleY = s;
        opacity = allowFade ? effectiveProgress : 1;
        break;
      }

      case "elevationRise": {
        const dist = clipDist ?? 24;
        tState.y = ((1 - effectiveProgress) * dist) || 0;
        opacity = allowFade ? effectiveProgress : 1;
        break;
      }

      case "glassIris": {
        const maxBlur = params.blurRadius ?? 20;
        const blur = (1 - effectiveProgress) * maxBlur;
        if (blur > 0.1) {
          filter = `blur(${blur.toFixed(1)}px)`;
        }
        const s = 0.95 + 0.05 * effectiveProgress;
        tState.scaleX = s;
        tState.scaleY = s;
        opacity = 0.3 + 0.7 * effectiveProgress;
        break;
      }

      case "kenBurns": {
        const p = effectiveProgress;
        const s = 1.0 + 0.08 * p;
        tState.scaleX = s;
        tState.scaleY = s;
        const panDist = (params.distance ?? 20) * p;
        tState.x = Number(panDist.toFixed(1));
        opacity = 1;
        break;
      }

      case "focusPull": {
        const maxBlur = params.blurRadius ?? 16;
        const blur = (1 - effectiveProgress) * maxBlur;
        if (blur > 0.1) {
          filter = `blur(${blur.toFixed(1)}px)`;
        }
        const s = 1.04 - 0.04 * effectiveProgress;
        tState.scaleX = s;
        tState.scaleY = s;
        opacity = effectiveProgress;
        break;
      }

      case "arrowShoot": {
        tState.scaleX = effectiveProgress;
        opacity = allowFade ? effectiveProgress : 1;
        break;
      }

      case "dashFlow": {
        opacity = 1;
        break;
      }

      case "iconPop": {
        const springVal = evaluateSpring(
          effectiveProgress,
          1.0,
          params.stiffness ?? 220,
          params.damping ?? 12
        );
        tState.scaleX = springVal;
        tState.scaleY = springVal;
        tState.rotate = -15 * (1 - effectiveProgress);
        opacity = allowFade ? Math.min(effectiveProgress * 2, 1) : 1;
        break;
      }

      case "stampSettle": {
        const dist = clipDist ?? 30;
        const springVal = evaluateSpring(
          effectiveProgress,
          1.0,
          params.stiffness ?? 240,
          params.damping ?? 16
        );
        tState.y = (-(1 - springVal) * dist) || 0;
        opacity = allowFade ? Math.min(effectiveProgress * 2, 1) : 1;
        break;
      }

      case "pop": {
        const initialScale = clipScale ?? params.initialScale ?? 0;
        const s = initialScale + (1 - initialScale) * effectiveProgress;
        tState.scaleX = s;
        tState.scaleY = s;
        opacity = allowFade ? Math.min(effectiveProgress * 1.5, 1) : 1;
        break;
      }

      case "popOut": {
        const p = 1 - effectiveProgress;
        tState.scaleX = p;
        tState.scaleY = p;
        opacity = allowFade ? p : 1;
        break;
      }

      case "grow": {
        const initialScale = clipScale ?? params.initialScale ?? 0.5;
        const s = initialScale + (1 - initialScale) * effectiveProgress;
        tState.scaleX = s;
        tState.scaleY = s;
        opacity = allowFade ? effectiveProgress : 1;
        break;
      }

      case "shrink": {
        const s = (clipScale ?? 1.5) - ((clipScale ?? 1.5) - 1) * effectiveProgress;
        tState.scaleX = s;
        tState.scaleY = s;
        opacity = allowFade ? effectiveProgress : 1;
        break;
      }

      case "spin": {
        const totalRot = clipRot ?? 180;
        tState.rotate = -totalRot * (1 - effectiveProgress);
        tState.scaleX = effectiveProgress;
        tState.scaleY = effectiveProgress;
        opacity = allowFade ? effectiveProgress : 1;
        break;
      }

      case "twist": {
        const totalRot = clipRot ?? 30;
        const initialScale = clipScale ?? 0.7;
        const rot = totalRot * (1 - effectiveProgress);
        const s = initialScale + (1 - initialScale) * effectiveProgress;
        tState.rotate = rot;
        tState.scaleX = s;
        tState.scaleY = s;
        opacity = allowFade ? effectiveProgress : 1;
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

      case "flip3D": {
        tState.perspective = params.perspective ?? 800;
        const angle = (1 - effectiveProgress) * (params.initialAngle ?? 60);
        tState.rotateX = angle;
        tState.rotateY = -angle * 0.8;
        opacity = effectiveProgress;
        break;
      }

      case "dropIn": {
        tState.perspective = 800;
        tState.z = (1 - effectiveProgress) * 300;
        opacity = effectiveProgress;
        break;
      }

      case "gravityFall": {
        const dist = params.distance ?? 300;
        const springVal = evaluateSpring(effectiveProgress, 1.0, 140, 14);
        tState.y = -(1 - springVal) * dist;
        opacity = Math.min(effectiveProgress * 2, 1);
        break;
      }

      case "elasticBounce": {
        const springVal = evaluateSpring(
          effectiveProgress,
          1.0,
          params.stiffness ?? 160,
          params.damping ?? 11
        );
        tState.scaleX = springVal;
        tState.scaleY = springVal;
        opacity = Math.min(effectiveProgress * 1.5, 1);
        break;
      }

      case "scaleReveal": {
        const p = Math.max(0, Math.min(1, effectiveProgress));
        const insetPercent = ((1 - p) * 50).toFixed(1);
        clipPath = `inset(${insetPercent}% ${insetPercent}% ${insetPercent}% ${insetPercent}%)`;
        const s = 0.85 + 0.15 * p;
        tState.scaleX = s;
        tState.scaleY = s;
        opacity = Math.min(p * 1.5, 1);
        break;
      }

      case "circleIris": {
        const clampedP = Math.max(0, Math.min(1.5, effectiveProgress));
        const radiusPercent = (clampedP * 75).toFixed(1);
        clipPath = `circle(${radiusPercent}% at ${params.origin || "50% 50%"})`;
        opacity = 1;
        break;
      }

      case "jellySquash": {
        const p = effectiveProgress;
        const damp = Math.exp(-4 * p);
        const osc = Math.sin(p * Math.PI * 3) * damp * 0.35;
        tState.scaleX = 1 + osc;
        tState.scaleY = 1 - osc;
        opacity = Math.min(p * 2, 1);
        break;
      }

      case "glitchDisintegrate": {
        const p = Math.max(0, Math.min(1, effectiveProgress));
        const jitterX = Math.sin(p * 45) * (1 - p) * 15;
        tState.x = Number(jitterX.toFixed(1));
        const topSlice = ((1 - p) * 30).toFixed(1);
        const bottomSlice = ((1 - p) * 40).toFixed(1);
        clipPath = `inset(${topSlice}% 0% ${bottomSlice}% 0%)`;
        opacity = p;
        break;
      }

      case "wipe":
      case "mask_reveal":
      case "maskWipe": {
        const maskDir = typeof config.direction === "string" && ["up", "down", "left", "right"].includes(config.direction) ? config.direction : (params.direction || "up");
        clipPath = evalMaskInset(effectiveProgress, maskDir as any);
        opacity = 1;
        break;
      }

      case "circleReveal": {
        const clampedP = Math.max(0, Math.min(1.5, effectiveProgress));
        const radiusPercent = (clampedP * 75).toFixed(1);
        clipPath = `circle(${radiusPercent}% at ${params.origin || "50% 50%"})`;
        opacity = 1;
        break;
      }

      default:
        opacity = effectiveProgress;
        break;
    }
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
 * Evaluates a single keyframe track at timestamp t.
 */
export function evaluateKeyframeTrack(
  track: AnimationTrack,
  currentTime: number
): number | string | undefined {
  if (!track.keyframes || track.keyframes.length === 0) return undefined;
  const sorted = [...track.keyframes].sort((a, b) => a.time - b.time);

  if (currentTime <= sorted[0].time) return sorted[0].value;
  if (currentTime >= sorted[sorted.length - 1].time) return sorted[sorted.length - 1].value;

  for (let i = 0; i < sorted.length - 1; i++) {
    const k1 = sorted[i];
    const k2 = sorted[i + 1];
    if (currentTime >= k1.time && currentTime <= k2.time) {
      const dt = k2.time - k1.time;
      if (dt <= 0) return k2.value;
      const p = (currentTime - k1.time) / dt;
      let easeFn: (t: number) => number;
      if (Array.isArray(k1.easing) && k1.easing.length === 4) {
        easeFn = getEasing("custom", k1.easing);
      } else if (typeof k1.easing === "string") {
        easeFn = getEasing(k1.easing);
      } else {
        easeFn = (t: number) => t;
      }
      const easedP = easeFn(p);

      if (typeof k1.value === "number" && typeof k2.value === "number") {
        return k1.value + (k2.value - k1.value) * easedP;
      }
      return easedP < 1 ? k1.value : k2.value;
    }
  }
  return sorted[sorted.length - 1].value;
}
