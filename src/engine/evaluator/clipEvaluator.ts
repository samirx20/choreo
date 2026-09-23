import { Layer, AnimationClip, getLayerClips } from "@/types/scene";
import { getEasing } from "../easings";
import { TransformState } from "../atomics";
import { quantizeTime } from "./quantizeTime";
import { evaluateAnimationConfig } from "./configEvaluator";

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
  color?: string;
  backgroundColor?: string;
  borderRadius?: number;
  borderWidth?: number;
  borderColor?: string;
  boxShadow?: string;
  backdropFilter?: string;
  widthDelta?: number;
  heightDelta?: number;
  trimStart?: number;
  trimEnd?: number;
  trimOffset?: number;
}

export function evaluateClipDelta(
  clip: AnimationClip,
  currentTime: number,
  inheritedStepFps?: "smooth" | number
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
  const effectiveFps = clip.stepFps ?? inheritedStepFps;
  const t = quantizeTime(currentTime, effectiveFps);

  // 1. PRE-WINDOW
  if (t < start) {
    if (preset === "drawOn" || preset === "trimPath" || preset === "arrowShoot") {
      d.trimEnd = type === "out" ? 100 : 0;
      d.opacity = type === "out" ? 1 : 0;
      return d;
    }
    if (preset === "morphIn" || (preset === "morph" && type === "in")) {
      d.opacity = 0;
      return d;
    }
    if (type === "in") {
      if (preset.startsWith("custom_")) {
        const preDelta = applyCustomPresetDelta(clip, 0, d);
        preDelta.opacity = 0;
        return preDelta;
      }
      const preIn = evaluateAnimationConfig({ ...clip, start }, t, "in", effectiveFps);
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
  if (t >= start + safeDur && !loop) {
    if (preset === "drawOn" || preset === "trimPath" || preset === "arrowShoot") {
      d.trimEnd = type === "out" ? 0 : 100;
      d.opacity = type === "out" ? 0 : 1;
      return d;
    }
    if (type === "out") {
      if (preset.startsWith("custom_")) {
        const postDelta = applyCustomPresetDelta(clip, 1, d);
        postDelta.opacity = 0;
        return postDelta;
      }
      d.opacity = 0;
      return d;
    }
    if (type === "in" && preset.startsWith("custom_")) {
      const postDelta = applyCustomPresetDelta(clip, 1, d);
      postDelta.opacity = 1;
      return postDelta;
    }
    if (type === "action" && clip.fillMode === "forwards") {
      const finalEval = evaluateAnimationConfig({ ...clip, start }, start + safeDur, "in", effectiveFps);
      d.x = finalEval.transform.x;
      d.y = finalEval.transform.y;
      d.scaleX = finalEval.transform.scaleX;
      d.scaleY = finalEval.transform.scaleY;
      d.rotate = finalEval.transform.rotate;
      return d;
    }
    if (preset.startsWith("custom_")) {
      return applyCustomPresetDelta(clip, 1, d);
    }
    return d;
  }

  // 3. ACTIVE INTERPOLATION
  let progress = 0;
  if (loop) {
    const elapsed = t - start;
    progress = (elapsed % safeDur) / safeDur;
  } else {
    const rawProgress = Math.min(Math.max((t - start) / safeDur, 0), 1);
    const springConfig =
      clip.springStiffness || clip.springDamping
        ? {
            stiffness: clip.springStiffness,
            damping: clip.springDamping,
            mass: clip.springMass,
          }
        : undefined;
    const easeFn = getEasing(easing, bezierPoints, params.overshootAmount, springConfig);
    progress = easeFn(rawProgress);
  }

  if (preset === "drawOn" || preset === "trimPath" || preset === "arrowShoot") {
    d.trimEnd = type === "out"
      ? Math.max(0, Math.min(100, (1 - progress) * 100))
      : Math.max(0, Math.min(100, progress * 100));
    d.opacity = 1;
    return d;
  }

  if (preset === "dashFlow") {
    d.trimOffset = Math.round(progress * 100);
    d.opacity = 1;
    return d;
  }

  if (preset === "morph") {
    if (type === "out") {
      d.opacity = Math.max(0, 1 - progress);
      d.scaleX = 1 - progress * 0.08;
      d.scaleY = 1 - progress * 0.08;
      d.blur = progress * 3;
      return d;
    } else {
      d.opacity = Math.min(1, progress);
      d.scaleX = 0.95 + progress * 0.05;
      d.scaleY = 0.95 + progress * 0.05;
      d.blur = (1 - progress) * 3;
      return d;
    }
  }

  if (preset === "morphIn") {
    d.opacity = Math.min(1, progress);
    d.scaleX = 0.95 + progress * 0.05;
    d.scaleY = 0.95 + progress * 0.05;
    d.blur = (1 - progress) * 3;
    return d;
  }

  if (preset.startsWith("custom_")) {
    const customDelta = applyCustomPresetDelta(clip, progress, d);
    if (type === "in") {
      if (clip.params?.opacity === undefined && clip.from?.opacity === undefined && clip.preset !== "custom_opacity") {
        customDelta.opacity = progress;
      }
    } else if (type === "out") {
      if (clip.params?.opacity === undefined && clip.from?.opacity === undefined && clip.preset !== "custom_opacity") {
        customDelta.opacity = 1 - progress;
      }
    }
    return customDelta;
  }

  if (type === "emphasis" || type === "action" || type === "custom") {
    const rawPhase = loop
      ? (Math.max(0, t - start) % safeDur) / safeDur
      : Math.min(Math.max((t - start) / safeDur, 0), 1);
    const rawPingPong = rawPhase < 0.5 ? rawPhase * 2 : (1 - rawPhase) * 2;
    const springConfig =
      clip.springStiffness || clip.springDamping
        ? {
            stiffness: clip.springStiffness,
            damping: clip.springDamping,
            mass: clip.springMass,
          }
        : undefined;
    const easeFn = getEasing(easing, bezierPoints, params.overshootAmount, springConfig);
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
      case "float":
      case "floating": {
        const p = loop ? (Math.max(0, currentTime - start) % safeDur) / safeDur : (rawPhase < 0.5 ? rawPhase * 2 : (1 - rawPhase) * 2);
        d.y = -distanceVal * (loop ? Math.sin(p * Math.PI * 2) : pingPong);
        break;
      }
      case "breathe":
      case "breathing": {
        const deltaS = scaleDeltaVal * pingPong;
        d.scaleX = 1 + deltaS;
        d.scaleY = 1 + deltaS;
        d.opacity = Math.max(0, 1 - 0.25 * pingPong);
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
      case "boil": {
        const fpsVal = clip.stepFps ?? inheritedStepFps ?? 8;
        const fps = typeof fpsVal === "number" ? fpsVal : 8;
        const frame = Math.floor(currentTime * fps);
        // Deterministic pseudo-random hash based on frame index (O(1) closed-form)
        const h1 = Math.sin(frame * 12.9898 + 78.233) * 43758.5453;
        const h2 = Math.sin(frame * 27.6419 + 41.897) * 23421.6312;
        const h3 = Math.sin(frame * 93.1234 + 19.345) * 85734.1234;
        const r1 = (h1 - Math.floor(h1)) * 2 - 1; // -1 .. 1
        const r2 = (h2 - Math.floor(h2)) * 2 - 1;
        const r3 = (h3 - Math.floor(h3)) * 2 - 1;
        const rotAngle = (clip.rotationDegrees ?? params.angle ?? 1.5) * intensity;
        const offsetDist = (clip.distance ?? params.distance ?? 2) * intensity;
        d.rotate = r1 * rotAngle;
        d.x = r2 * offsetDist;
        d.y = r3 * offsetDist;
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
      case "custom_move":
      case "custom_scale":
      case "custom_rotate":
      case "custom_opacity":
      case "custom_color":
      case "custom_shadow":
      case "custom_blur":
      case "custom_backdrop_blur":
      case "custom_glass":
      case "custom_visibility":
      case "custom_resize":
      case "custom_morph":
      case "custom_radius":
      case "custom_stroke": {
        const factor = loop ? pingPong : progress;
        return applyCustomPresetDelta(clip, factor, d);
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
  const evalResult = evaluateAnimationConfig({ ...clip, start }, t, mode, effectiveFps);
  const effProgress = mode === "out" ? 1 - progress : progress;

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
    boxShadow:
      preset === "elevationRise"
        ? `0px ${Math.round(4 + 16 * effProgress)}px ${Math.round(8 + 32 * effProgress)}px rgba(0,0,0,${(0.05 + 0.15 * effProgress).toFixed(2)})`
        : undefined,
    backdropFilter:
      preset === "glassIris"
        ? `blur(${Math.round(20 * effProgress)}px)`
        : undefined,
  };
}

function parseHex(c: string): [number, number, number] {
  let hex = c.replace("#", "").trim();
  if (hex.length === 3) {
    hex = hex.split("").map((x) => x + x).join("");
  }
  const num = parseInt(hex, 16);
  if (isNaN(num)) return [109, 40, 217];
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function lerpColor(c1: string, c2: string, t: number): string {
  const [r1, g1, b1] = parseHex(c1);
  const [r2, g2, b2] = parseHex(c2);
  const r = Math.min(255, Math.max(0, Math.round(r1 + (r2 - r1) * t)));
  const g = Math.min(255, Math.max(0, Math.round(g1 + (g2 - g1) * t)));
  const b = Math.min(255, Math.max(0, Math.round(b1 + (b2 - b1) * t)));
  return `rgb(${r}, ${g}, ${b})`;
}

export function applyCustomPresetDelta(
  clip: AnimationClip,
  factor: number,
  d: EvaluatedDelta
): EvaluatedDelta {
  const {
    preset,
    params = {},
    from = {},
    scaleAmount,
    rotationDegrees,
    distance,
    direction,
    intensity = 1,
  } = clip;
  const dist = (distance ?? params.distance ?? 60) * intensity;
  const dir = direction || params.direction || "up";
  const rot = (rotationDegrees ?? params.rotationDegrees ?? 90) * intensity;

  switch (preset) {
    case "custom_move": {
      const defaultToY = dir === "up" ? -dist : dir === "down" ? dist : 0;
      const defaultToX = dir === "left" ? -dist : dir === "right" ? dist : 0;
      const fromX = from.x ?? from.distance ?? params.fromX ?? params.fromDistance ?? 0;
      const toX = params.toX ?? defaultToX;
      const fromY = from.y ?? params.fromY ?? 0;
      const toY = params.toY ?? defaultToY;
      d.x = fromX + (toX - fromX) * factor;
      d.y = fromY + (toY - fromY) * factor;
      break;
    }
    case "custom_scale": {
      const defaultFromS = clip.type === "in" ? 0 : 1.0;
      const defaultToS = clip.type === "out" ? 0 : (scaleAmount ?? params.scaleAmount ?? 1.2);
      const fromS = from.scale ?? params.fromScale ?? defaultFromS;
      const toS = params.toScale ?? (scaleAmount ?? params.scaleAmount ?? defaultToS);
      const s = fromS + (toS - fromS) * factor;
      d.scaleX = s;
      d.scaleY = s;
      break;
    }
    case "custom_rotate": {
      const fromR = from.rotate ?? params.fromRotate ?? 0;
      const toR = params.toRotate ?? rot;
      d.rotate = fromR + (toR - fromR) * factor;
      break;
    }
    case "custom_opacity": {
      const defaultFromOp = clip.type === "in" ? 0 : 1;
      const defaultToOp = clip.type === "out" ? 0 : 1;
      const fromOp = from.opacity ?? params.fromOpacity ?? defaultFromOp;
      const toOp = params.toOpacity ?? (params.opacity ?? defaultToOp);
      d.opacity = Math.max(0, Math.min(1, fromOp + (toOp - fromOp) * factor));
      break;
    }
    case "custom_color": {
      const fromCol = from.color ?? params.fromColor ?? null;
      const toCol = params.toColor ?? params.color ?? "#6d28d9";
      const finalColor = fromCol ? (factor >= 1 ? toCol : lerpColor(fromCol, toCol, factor)) : toCol;
      d.color = finalColor;
      d.backgroundColor = finalColor;
      break;
    }
    case "custom_shadow": {
      const fromSb = from.shadowBlur ?? params.fromShadowBlur ?? 0;
      const toSb = params.toShadowBlur ?? params.shadowBlur ?? 16;
      const fromSd = from.shadowDistance ?? params.fromShadowDistance ?? 0;
      const toSd = params.toShadowDistance ?? params.shadowDistance ?? 8;
      const fromSa = from.shadowAngle ?? params.fromShadowAngle ?? 90;
      const toSa = params.toShadowAngle ?? params.shadowAngle ?? 90;
      const blur = fromSb + (toSb - fromSb) * factor;
      const dist = fromSd + (toSd - fromSd) * factor;
      const angle = fromSa + (toSa - fromSa) * factor;
      const rad = (angle * Math.PI) / 180;
      const dx = (Math.cos(rad) * dist).toFixed(1);
      const dy = (Math.sin(rad) * dist).toFixed(1);
      d.boxShadow = `${dx}px ${dy}px ${blur.toFixed(1)}px rgba(0,0,0,0.35)`;
      break;
    }
    case "custom_blur": {
      const fromB = from.blur ?? params.fromBlur ?? 0;
      const toB = params.toBlur ?? params.blur ?? 10;
      d.blur = Math.max(0, fromB + (toB - fromB) * factor);
      break;
    }
    case "custom_backdrop_blur": {
      const fromBb = from.backdropBlur ?? from.blur ?? params.fromBackdropBlur ?? params.fromBlur ?? 0;
      const toBb = params.toBackdropBlur ?? params.toBlur ?? params.backdropBlur ?? params.blur ?? 16;
      const bb = Math.max(0, fromBb + (toBb - fromBb) * factor);
      d.backdropFilter = `blur(${bb.toFixed(1)}px)`;
      break;
    }
    case "custom_glass": {
      const fromBb = from.backdropBlur ?? params.fromBackdropBlur ?? 0;
      const toBb = params.toBackdropBlur ?? params.backdropBlur ?? 20;
      const fromOp = from.opacity ?? params.fromOpacity ?? 1;
      const toOp = params.toOpacity ?? (params.opacity ?? 0.8);
      const bb = Math.max(0, fromBb + (toBb - fromBb) * factor);
      d.backdropFilter = `blur(${bb.toFixed(1)}px)`;
      d.opacity = Math.max(0, Math.min(1, fromOp + (toOp - fromOp) * factor));
      break;
    }
    case "custom_visibility": {
      const isHide = (params.visibility ?? "hide") === "hide";
      d.opacity = isHide ? (factor >= 1 ? 0 : 1 - factor) : factor;
      break;
    }
    case "custom_resize": {
      const hasAbsoluteW = params.toWidth !== undefined && from.width !== undefined;
      const hasAbsoluteH = params.toHeight !== undefined && from.height !== undefined;
      const targetWDelta = hasAbsoluteW ? params.toWidth - from.width : (params.toWidthDelta ?? params.widthDelta ?? 50);
      const startWDelta = hasAbsoluteW ? 0 : (from.widthDelta ?? params.fromWidthDelta ?? 0);
      const targetHDelta = hasAbsoluteH ? params.toHeight - from.height : (params.toHeightDelta ?? params.heightDelta ?? 50);
      const startHDelta = hasAbsoluteH ? 0 : (from.heightDelta ?? params.fromHeightDelta ?? 0);

      d.widthDelta = startWDelta + (targetWDelta - startWDelta) * factor;
      d.heightDelta = startHDelta + (targetHDelta - startHDelta) * factor;
      break;
    }
    case "custom_morph": {
      const fromM = from.morphAmount ?? params.fromMorphAmount ?? 0;
      const toM = params.toMorphAmount ?? params.morphAmount ?? 1;
      const m = fromM + (toM - fromM) * factor;
      d.borderRadius = 50 * m;
      break;
    }
    case "custom_radius": {
      const fromR = from.radius ?? params.fromRadius ?? 0;
      const toR = params.toRadius ?? params.radius ?? 16;
      d.borderRadius = fromR + (toR - fromR) * factor;
      break;
    }
    case "custom_stroke": {
      const fromSw = from.strokeWidth ?? from.borderWidth ?? params.fromStrokeWidth ?? params.fromBorderWidth ?? 0;
      const toSw = params.toStrokeWidth ?? params.toBorderWidth ?? params.strokeWidth ?? params.borderWidth ?? 4;
      const fromSc = from.strokeColor ?? from.borderColor ?? params.fromStrokeColor ?? params.fromBorderColor ?? null;
      const toSc = params.toStrokeColor ?? params.toBorderColor ?? params.strokeColor ?? params.borderColor ?? "#6d28d9";
      d.borderWidth = fromSw + (toSw - fromSw) * factor;
      d.borderColor = fromSc ? (factor >= 1 ? toSc : lerpColor(fromSc, toSc, factor)) : toSc;
      break;
    }
    case "custom_trim": {
      const fromTe = from.trimEnd ?? params.fromTrimEnd ?? (clip.type === "out" ? 100 : 0);
      const toTe = params.toTrimEnd ?? params.trimEnd ?? (clip.type === "out" ? 0 : 100);
      const fromTs = from.trimStart ?? params.fromTrimStart ?? 0;
      const toTs = params.toTrimStart ?? params.trimStart ?? 0;
      const fromTo = from.trimOffset ?? params.fromTrimOffset ?? 0;
      const toTo = params.toTrimOffset ?? params.trimOffset ?? 0;
      d.trimStart = Math.max(0, Math.min(100, fromTs + (toTs - fromTs) * factor));
      d.trimEnd = Math.max(0, Math.min(100, fromTe + (toTe - fromTe) * factor));
      d.trimOffset = fromTo + (toTo - fromTo) * factor;
      break;
    }
  }
  return d;
}

export function compoundLayerAnimations(
  layer: Layer,
  currentTime: number,
  groupStartOffset = 0,
  inheritedStepFps?: "smooth" | number
): {
  transform: TransformState;
  opacity: number;
  filter?: string;
  clipPath?: string;
  backgroundColor?: string;
  color?: string;
  borderRadius?: string;
  borderWidth?: string;
  borderColor?: string;
  boxShadow?: string;
  backdropFilter?: string;
  widthDelta?: number;
  heightDelta?: number;
  trimStart?: number;
  trimEnd?: number;
  trimOffset?: number;
} {
  const clips = getLayerClips(layer);

  // 1. Pre-entrance rule: If layer has an In (Entrance) clip that has not started yet,
  // the layer is completely invisible on screen!
  const inClips = clips.filter((c) => c.type === "in");
  if (inClips.length > 0) {
    const minInStart = Math.min(...inClips.map((c) => c.start));
    if (currentTime < minInStart + groupStartOffset) {
      return {
        transform: {
          x: 0,
          y: 0,
          z: 0,
          scaleX: layer.style.scaleX ?? 1,
          scaleY: layer.style.scaleY ?? 1,
          rotate: layer.style.rotation ?? 0,
          rotateX: 0,
          rotateY: 0,
          perspective: 0,
        },
        opacity: 0,
      };
    }
  }

  // 2. Post-exit rule: If layer has an Out (Exit) clip that has already finished,
  // the layer is completely invisible on screen!
  const outClips = clips.filter((c) => c.type === "out");
  if (outClips.length > 0) {
    const maxOutEnd = Math.max(...outClips.map((c) => c.start + (c.duration || 0.6)));
    if (currentTime >= maxOutEnd + groupStartOffset) {
      return {
        transform: {
          x: 0,
          y: 0,
          z: 0,
          scaleX: layer.style.scaleX ?? 1,
          scaleY: layer.style.scaleY ?? 1,
          rotate: layer.style.rotation ?? 0,
          rotateX: 0,
          rotateY: 0,
          perspective: 0,
        },
        opacity: 0,
      };
    }
  }

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
  let activeBackgroundColor: string | undefined;
  let activeColor: string | undefined;
  let activeBorderRadius: string | undefined;
  let activeBorderWidth: string | undefined;
  let activeBorderColor: string | undefined;
  let activeBoxShadow: string | undefined;
  let activeBackdropFilter: string | undefined;
  let totalWidthDelta = 0;
  let totalHeightDelta = 0;
  let activeTrimStart: number | undefined;
  let activeTrimEnd: number | undefined;
  let activeTrimOffset: number | undefined;

  for (const clip of clips) {
    const adjustedClip = { ...clip, start: clip.start + groupStartOffset };
    const delta = evaluateClipDelta(adjustedClip, currentTime, inheritedStepFps);

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
    if (delta.backgroundColor) activeBackgroundColor = delta.backgroundColor;
    if (delta.color) activeColor = delta.color;
    if (delta.borderRadius !== undefined) activeBorderRadius = `${delta.borderRadius}px`;
    if (delta.borderWidth !== undefined) activeBorderWidth = `${delta.borderWidth}px`;
    if (delta.borderColor) activeBorderColor = delta.borderColor;
    if (delta.boxShadow) activeBoxShadow = delta.boxShadow;
    if (delta.backdropFilter) activeBackdropFilter = delta.backdropFilter;
    if (delta.widthDelta !== undefined) totalWidthDelta += delta.widthDelta;
    if (delta.heightDelta !== undefined) totalHeightDelta += delta.heightDelta;
    if (delta.trimStart !== undefined) activeTrimStart = delta.trimStart;
    if (delta.trimEnd !== undefined) activeTrimEnd = delta.trimEnd;
    if (delta.trimOffset !== undefined) activeTrimOffset = delta.trimOffset;
  }

  opacity = Math.max(0, Math.min(1, opacity));

  return {
    transform,
    opacity,
    filter: totalBlur > 0.1 ? `blur(${totalBlur.toFixed(1)}px)` : undefined,
    clipPath: activeClipPath,
    backgroundColor: activeBackgroundColor,
    color: activeColor,
    borderRadius: activeBorderRadius,
    borderWidth: activeBorderWidth,
    borderColor: activeBorderColor,
    boxShadow: activeBoxShadow,
    backdropFilter: activeBackdropFilter,
    widthDelta: totalWidthDelta !== 0 ? totalWidthDelta : undefined,
    heightDelta: totalHeightDelta !== 0 ? totalHeightDelta : undefined,
    trimStart: activeTrimStart,
    trimEnd: activeTrimEnd,
    trimOffset: activeTrimOffset,
  };
}
