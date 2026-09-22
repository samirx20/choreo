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
      } else if (preset === "mask_reveal" || preset === "maskWipe") {
        initOpacity = 1;
        const maskDir = typeof config.direction === "string" && ["up", "down", "left", "right"].includes(config.direction) ? config.direction : (params.direction || "up");
        clipPath = evalMaskInset(0, maskDir as any);
      } else if (preset === "circleReveal") {
        clipPath = `circle(0% at ${params.origin || "50% 50%"})`;
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

      case "slideUp": {
        const dist = clipDist ?? 60;
        tState.y = (1 - effectiveProgress) * dist;
        opacity = allowFade ? effectiveProgress : 1;
        break;
      }

      case "slideDown": {
        const dist = clipDist ?? 60;
        tState.y = -(1 - effectiveProgress) * dist;
        opacity = allowFade ? effectiveProgress : 1;
        break;
      }

      case "slideLeft": {
        const dist = clipDist ?? 80;
        tState.x = (1 - effectiveProgress) * dist;
        opacity = allowFade ? effectiveProgress : 1;
        break;
      }

      case "slideRight": {
        const dist = clipDist ?? 80;
        tState.x = -(1 - effectiveProgress) * dist;
        opacity = allowFade ? effectiveProgress : 1;
        break;
      }

      case "slide": {
        const dist = clipDist ?? 60;
        const dir = config.direction || params.direction || "up";
        if (dir === "down") tState.y = -(1 - effectiveProgress) * dist;
        else if (dir === "left") tState.x = (1 - effectiveProgress) * dist;
        else if (dir === "right") tState.x = -(1 - effectiveProgress) * dist;
        else tState.y = (1 - effectiveProgress) * dist;
        opacity = allowFade ? effectiveProgress : 1;
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
        const p = effectiveProgress;
        const insetPercent = ((1 - p) * 50).toFixed(1);
        clipPath = `inset(${insetPercent}% ${insetPercent}% ${insetPercent}% ${insetPercent}%)`;
        const s = 0.85 + 0.15 * p;
        tState.scaleX = s;
        tState.scaleY = s;
        opacity = Math.min(p * 1.5, 1);
        break;
      }

      case "circleIris": {
        const radiusPercent = (effectiveProgress * 75).toFixed(1);
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
        const p = effectiveProgress;
        const jitterX = Math.sin(p * 45) * (1 - p) * 15;
        tState.x = Number(jitterX.toFixed(1));
        const topSlice = ((1 - p) * 30).toFixed(1);
        const bottomSlice = ((1 - p) * 40).toFixed(1);
        clipPath = `inset(${topSlice}% 0% ${bottomSlice}% 0%)`;
        opacity = p;
        break;
      }

      case "maskWipe": {
        const maskDir = typeof config.direction === "string" && ["up", "down", "left", "right"].includes(config.direction) ? config.direction : (params.direction || "up");
        clipPath = evalMaskInset(effectiveProgress, maskDir as any);
        opacity = 1;
        break;
      }

      case "circleReveal": {
        const radiusPercent = (effectiveProgress * 75).toFixed(1);
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
