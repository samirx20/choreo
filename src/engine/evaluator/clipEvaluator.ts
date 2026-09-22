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
    if (type === "in") {
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
    if (type === "out") {
      d.opacity = 0;
      return d;
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
    const easeFn = getEasing(easing, bezierPoints, params.overshootAmount);
    progress = easeFn(rawProgress);
  }

  if (type === "emphasis" || type === "action" || type === "custom") {
    const rawPhase = loop
      ? (Math.max(0, t - start) % safeDur) / safeDur
      : Math.min(Math.max((t - start) / safeDur, 0), 1);
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
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
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
      const fromS = from.scale ?? params.fromScale ?? 1.0;
      const toS = params.toScale ?? (scaleAmount ?? params.scaleAmount ?? 1.2);
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
      const fromOp = from.opacity ?? params.fromOpacity ?? 1;
      const toOp = params.toOpacity ?? (params.opacity ?? 0);
      d.opacity = Math.max(0, Math.min(1, fromOp + (toOp - fromOp) * factor));
      break;
    }
    case "custom_color": {
      const fromCol = from.color ?? params.fromColor ?? null;
      const toCol = params.toColor ?? params.color ?? "#6d28d9";
      const finalColor = fromCol ? lerpColor(fromCol, toCol, factor) : toCol;
      d.color = finalColor;
      d.backgroundColor = finalColor;
      break;
    }
    case "custom_shadow": {
      const fromBlur = from.shadowBlur ?? params.fromShadowBlur ?? 0;
      const toBlur = params.toShadowBlur ?? params.shadowBlur ?? 16;
      const fromDist = from.shadowDistance ?? params.fromShadowDistance ?? 0;
      const toDist = params.toShadowDistance ?? params.shadowDistance ?? 8;
      const blur = fromBlur + (toBlur - fromBlur) * factor;
      const shadowDist = fromDist + (toDist - fromDist) * factor;
      const col = params.shadowColor ?? "rgba(0,0,0,0.5)";
      d.boxShadow = `0px ${shadowDist.toFixed(1)}px ${blur.toFixed(1)}px ${col}`;
      break;
    }
    case "custom_blur": {
      const fromB = from.blur ?? params.fromBlur ?? 0;
      const toB = params.toBlur ?? params.blur ?? 10;
      d.blur = fromB + (toB - fromB) * factor;
      break;
    }
    case "custom_backdrop_blur": {
      const fromBb = from.backdropBlur ?? params.fromBackdropBlur ?? 0;
      const toBb = params.toBackdropBlur ?? params.backdropBlur ?? 16;
      const bb = fromBb + (toBb - fromBb) * factor;
      d.backdropFilter = `blur(${bb.toFixed(1)}px)`;
      break;
    }
    case "custom_glass": {
      const fromBb = from.backdropBlur ?? params.fromBackdropBlur ?? 0;
      const toBb = params.toBackdropBlur ?? params.backdropBlur ?? 20;
      const fromOp = from.opacity ?? params.fromOpacity ?? 1;
      const toOp = params.toOpacity ?? (params.opacity ?? 0.8);
      const bb = fromBb + (toBb - fromBb) * factor;
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
      const fromW = from.widthDelta ?? params.fromWidthDelta ?? 0;
      const toW = params.toWidthDelta ?? params.widthDelta ?? 50;
      const fromH = from.heightDelta ?? params.fromHeightDelta ?? 0;
      const toH = params.toHeightDelta ?? params.heightDelta ?? 50;
      d.widthDelta = fromW + (toW - fromW) * factor;
      d.heightDelta = fromH + (toH - fromH) * factor;
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
      const fromSw = from.strokeWidth ?? params.fromStrokeWidth ?? 0;
      const toSw = params.toStrokeWidth ?? params.strokeWidth ?? 4;
      const fromSc = from.strokeColor ?? params.fromStrokeColor ?? null;
      const toSc = params.toStrokeColor ?? params.strokeColor ?? "#6d28d9";
      d.borderWidth = fromSw + (toSw - fromSw) * factor;
      d.borderColor = fromSc ? lerpColor(fromSc, toSc, factor) : toSc;
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
  let activeBackgroundColor: string | undefined;
  let activeColor: string | undefined;
  let activeBorderRadius: string | undefined;
  let activeBorderWidth: string | undefined;
  let activeBorderColor: string | undefined;
  let activeBoxShadow: string | undefined;
  let activeBackdropFilter: string | undefined;
  let totalWidthDelta = 0;
  let totalHeightDelta = 0;

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
  };
}
