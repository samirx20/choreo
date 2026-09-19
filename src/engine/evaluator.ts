import React from "react";
import {
  Layer,
  GroupLayer,
  CounterLayer,
  AnimationConfig,
  AnimationClip,
  AnimationTrack,
  getLayerClips,
} from "@/types/scene";
import { getEasing, evaluateSpring } from "./easings";
import {
  defaultTransformState,
  compileTransform,
  TransformState,
  evalMaskInset,
} from "./atomics";
import { resolveSceneBindings } from "./bindings/dependencyEngine";

/**
 * Deterministically evaluates the interpolated number string for a CounterLayer at timestamp t.
 */
export function evaluateCounterValue(
  counter: CounterLayer,
  currentTime: number,
  startOffset = 0
): string {
  let progress = 1;
  if (counter.animation?.in) {
    const anim = counter.animation.in;
    const startTime = anim.start + startOffset;
    const dur = Math.max(anim.duration || 1.0, 0.05);
    if (currentTime < startTime) {
      progress = 0;
    } else if (currentTime >= startTime + dur) {
      progress = 1;
    } else {
      const easeFn = getEasing(anim.easing, anim.bezierPoints, anim.params?.overshootAmount);
      progress = easeFn((currentTime - startTime) / dur);
    }
  }

  const currentNumeric = counter.startValue + (counter.endValue - counter.startValue) * progress;
  const decimals = counter.decimals ?? 0;
  const formattedNumber = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    useGrouping: counter.useGrouping !== false,
  }).format(currentNumeric);

  return `${counter.prefix || ""}${formattedNumber}${counter.suffix || ""}`;
}

export interface ComputedFrameStyles {
  [layerId: string]: React.CSSProperties;
}

/**
 * Deterministically evaluates CSS properties for an animation config at relative time t.
 */
export function evaluateAnimationConfig(
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
  const easeFn = getEasing(easing, bezierPoints, params.overshootAmount);

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
      } else if (preset === "shrink" || preset === "popOut") {
        tState.scaleX = 1.5;
        tState.scaleY = 1.5;
      } else if (params.angle !== undefined && (preset.startsWith("slide") || preset === "polarSlide")) {
        const dist = params.distance ?? 60;
        const rad = (params.angle * Math.PI) / 180;
        tState.x = Math.cos(rad) * dist;
        tState.y = Math.sin(rad) * dist;
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
      } else if (preset === "flip3D") {
        tState.perspective = params.perspective ?? 600;
        tState.rotateX = params.initialAngle ?? 60;
        tState.rotateY = -(params.initialAngle ?? 60);
      } else if (preset === "dropIn" || preset === "gravityFall") {
        tState.perspective = 800;
        tState.y = -(params.distance ?? 300);
      } else if (preset === "elasticBounce") {
        tState.scaleX = 0;
        tState.scaleY = 0;
      } else if (preset === "scaleReveal") {
        tState.scaleX = 0.8;
        tState.scaleY = 0.8;
        clipPath = "inset(50% 50% 50% 50%)";
      } else if (preset === "circleIris") {
        clipPath = "circle(0% at 50% 50%)";
      } else if (preset === "jellySquash") {
        tState.scaleX = 0.5;
        tState.scaleY = 1.4;
      } else if (preset === "glitchDisintegrate") {
        tState.x = 20;
        clipPath = "inset(30% 0% 30% 0%)";
      } else if (preset === "maskWipe") {
        initOpacity = 1;
        clipPath = evalMaskInset(0, params.direction || "up");
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

  // Check polar slide override
  if (params.angle !== undefined && (preset.startsWith("slide") || preset === "polarSlide")) {
    const dist = params.distance ?? 60;
    const rad = (params.angle * Math.PI) / 180;
    tState.x = (1 - effectiveProgress) * Math.cos(rad) * dist;
    tState.y = (1 - effectiveProgress) * Math.sin(rad) * dist;
    opacity = effectiveProgress;
  } else {
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

      case "popOut": {
        const p = 1 - effectiveProgress;
        tState.scaleX = p;
        tState.scaleY = p;
        opacity = p;
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
        clipPath = evalMaskInset(effectiveProgress, params.direction || "up");
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
function evaluateKeyframeTrack(
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

export interface EvaluatedDelta {
  x: number;
  y: number;
  z: number;
  scaleX: number;
  scaleY: number;
  rotate: number;
  rotateX: number;
  rotateY: number;
  perspective: number;
  opacity: number;
  blur: number;
  clipPath?: string;
}

export function evaluateClipDelta(
  clip: AnimationClip,
  currentTime: number
): EvaluatedDelta {
  const d: EvaluatedDelta = {
    x: 0,
    y: 0,
    z: 0,
    scaleX: 1,
    scaleY: 1,
    rotate: 0,
    rotateX: 0,
    rotateY: 0,
    perspective: 0,
    opacity: 1,
    blur: 0,
  };

  const { start, duration, preset, easing, bezierPoints, params = {}, type, loop } = clip;
  const safeDur = Math.max(duration || 0.6, 0.05);

  // 1. PRE-WINDOW
  if (currentTime < start) {
    if (type === "in") {
      const preIn = evaluateAnimationConfig({ ...clip, start }, currentTime, "in");
      return {
        x: preIn.transform.x,
        y: preIn.transform.y,
        z: preIn.transform.z,
        scaleX: preIn.transform.scaleX,
        scaleY: preIn.transform.scaleY,
        rotate: preIn.transform.rotate,
        rotateX: preIn.transform.rotateX,
        rotateY: preIn.transform.rotateY,
        perspective: preIn.transform.perspective,
        opacity: preIn.opacity,
        blur: preIn.filter ? parseFloat(preIn.filter.replace(/[^0-9.]/g, "")) || 0 : 0,
        clipPath: preIn.clipPath,
      };
    }
    return d;
  }

  // 2. POST-WINDOW
  if (currentTime >= start + safeDur && !loop) {
    if (type === "out") {
      d.opacity = 0;
      return d;
    }
    if (type === "action" && clip.fillMode === "forwards") {
      const finalEval = evaluateAnimationConfig({ ...clip, start }, start + safeDur, "in");
      d.x = finalEval.transform.x;
      d.y = finalEval.transform.y;
      d.scaleX = finalEval.transform.scaleX;
      d.scaleY = finalEval.transform.scaleY;
      d.rotate = finalEval.transform.rotate;
      return d;
    }
    return d;
  }

  // 3. ACTIVE INTERPOLATION
  let progress = 0;
  if (loop) {
    const elapsed = currentTime - start;
    progress = (elapsed % safeDur) / safeDur;
  } else {
    const rawProgress = Math.min(Math.max((currentTime - start) / safeDur, 0), 1);
    const easeFn = getEasing(easing, bezierPoints, params.overshootAmount);
    progress = easeFn(rawProgress);
  }

  if (type === "emphasis" || type === "action") {
    const rawPhase = loop
      ? (Math.max(0, currentTime - start) % safeDur) / safeDur
      : Math.min(Math.max((currentTime - start) / safeDur, 0), 1);
    const rawPingPong = rawPhase < 0.5 ? rawPhase * 2 : (1 - rawPhase) * 2;
    const easeFn = getEasing(easing, bezierPoints, params.overshootAmount);
    const pingPong = easeFn(rawPingPong);
    const intensity = clip.intensity ?? 1;
    const scaleBase = clip.scaleAmount ?? params.scale ?? 0.15;
    const scaleDeltaVal = (scaleBase > 1 ? scaleBase - 1 : scaleBase) * intensity;
    const distanceVal = (clip.distance ?? params.distance ?? 20) * intensity;
    const angleVal = (clip.rotationDegrees ?? params.angle ?? 8) * intensity;

    switch (preset) {
      case "pulse": {
        const deltaS = scaleDeltaVal * pingPong;
        d.scaleX = 1 + deltaS;
        d.scaleY = 1 + deltaS;
        break;
      }
      case "bounce": {
        d.y = -distanceVal * pingPong;
        break;
      }
      case "wiggle":
      case "shake": {
        d.rotate = (pingPong * 2 - 1) * angleVal;
        break;
      }
      case "flash":
      case "blink": {
        const amount = (params.amount ?? 0.7) * intensity;
        d.opacity = Math.max(0, 1 - amount * pingPong);
        break;
      }
      case "spin": {
        d.rotate = (loop ? progress : pingPong) * 360 * intensity;
        break;
      }
      case "heartbeat": {
        const b1 = Math.exp(-Math.pow((progress - 0.15) * 20, 2)) * 0.2;
        const b2 = Math.exp(-Math.pow((progress - 0.35) * 20, 2)) * 0.15;
        const s = 1 + (b1 + b2) * (scaleBase > 1 ? scaleBase - 1 : 1) * intensity;
        d.scaleX = s;
        d.scaleY = s;
        break;
      }
      default: {
        const deltaS = scaleDeltaVal * pingPong;
        d.scaleX = 1 + deltaS;
        d.scaleY = 1 + deltaS;
      }
    }
    return d;
  }

  const mode = type === "out" ? "out" : "in";
  const evalResult = evaluateAnimationConfig({ ...clip, start }, currentTime, mode);

  return {
    x: evalResult.transform.x,
    y: evalResult.transform.y,
    z: evalResult.transform.z,
    scaleX: evalResult.transform.scaleX,
    scaleY: evalResult.transform.scaleY,
    rotate: evalResult.transform.rotate,
    rotateX: evalResult.transform.rotateX,
    rotateY: evalResult.transform.rotateY,
    perspective: evalResult.transform.perspective,
    opacity: evalResult.opacity,
    blur: evalResult.filter ? parseFloat(evalResult.filter.replace(/[^0-9.]/g, "")) || 0 : 0,
    clipPath: evalResult.clipPath,
  };
}

export function compoundLayerAnimations(
  layer: Layer,
  currentTime: number,
  groupStartOffset = 0
): {
  transform: TransformState;
  opacity: number;
  filter?: string;
  clipPath?: string;
} {
  const clips = getLayerClips(layer);

  const transform: TransformState = {
    x: 0,
    y: 0,
    z: 0,
    scaleX: layer.style.scaleX ?? 1,
    scaleY: layer.style.scaleY ?? 1,
    rotate: layer.style.rotation ?? 0,
    rotateX: 0,
    rotateY: 0,
    perspective: 0,
  };
  let opacity = layer.style.opacity ?? 1;
  let totalBlur = layer.style.filterBlur ?? 0;
  let activeClipPath: string | undefined;

  for (const clip of clips) {
    const adjustedClip = { ...clip, start: clip.start + groupStartOffset };
    const delta = evaluateClipDelta(adjustedClip, currentTime);

    transform.x += delta.x;
    transform.y += delta.y;
    transform.z += delta.z;
    transform.scaleX *= delta.scaleX;
    transform.scaleY *= delta.scaleY;
    transform.rotate += delta.rotate;
    transform.rotateX += delta.rotateX;
    transform.rotateY += delta.rotateY;
    if (delta.perspective > 0) {
      transform.perspective = Math.max(transform.perspective, delta.perspective);
    }
    opacity *= delta.opacity;
    totalBlur += delta.blur;
    if (delta.clipPath) {
      activeClipPath = delta.clipPath;
    }
  }

  opacity = Math.max(0, Math.min(1, opacity));

  return {
    transform,
    opacity,
    filter: totalBlur > 0.1 ? `blur(${totalBlur.toFixed(1)}px)` : undefined,
    clipPath: activeClipPath,
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
      // Modern Multi-Clip evaluation when clips array is populated
      if (layer.animation.clips && layer.animation.clips.length > 0) {
        const compounded = compoundLayerAnimations(layer, currentTime, groupStartOffset);
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
      } else {
        // Legacy single-slot In animation
        if (layer.animation.in) {
          const anim = layer.animation.in;
        if ((layer.type === "text" || layer.type === "chunk") && (anim.animateBy === "word" || anim.animateBy === "character")) {
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
        if ((layer.type === "text" || layer.type === "chunk") && (anim.animateBy === "word" || anim.animateBy === "character")) {
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
            } else if (track.property === "scale" || track.property === "scaleX" || track.property === "scaleY") {
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
      const col = layer.style.shadowColor ?? '#000000';
      const alpha = layer.style.shadowOpacity ?? 0.5;
      const alphaHex = Math.max(0, Math.min(255, Math.round(alpha * 255))).toString(16).padStart(2, '0');
      css.boxShadow = `${dx.toFixed(1)}px ${dy.toFixed(1)}px ${blur}px ${spread}px ${col}${alphaHex}`;
    } else if (layer.style.elevation && layer.style.elevation > 0 && (!layer.style.shadows || layer.style.shadows.length === 0)) {
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
    if (layer.type === "group") {
      const groupLayer = layer as GroupLayer;
      // Double-Stagger Fix: If children already have explicit positive start times baked into the AST,
      // do not double-add the cascade stagger offset.
      const hasExplicitChildStarts = groupLayer.children.some(
        (c, idx) => idx > 0 && (c.animation?.in?.start || 0) > 0
      );
      const stagger = (groupLayer.autoLink && !hasExplicitChildStarts) ? (groupLayer.staggerDelay ?? 0.15) : 0;
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

  if (groupStartOffset === 0) {
    return resolveSceneBindings(layers, result, currentTime);
  }

  return result;
}

