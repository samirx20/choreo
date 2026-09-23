import type { EasingType, AnimationPreset } from "@/types/animation";

/**
 * Optical and bounded channels where non-monotonic overshoot (bounce, elastic, overshoot)
 * would create negative values, values > 1.0, or color channel explosions.
 */
export const MONOTONIC_ONLY_CHANNELS = new Set([
  "opacity",
  "color",
  "backgroundColor",
  "borderColor",
  "blur",
  "backdropBlur",
  "trimStart",
  "trimEnd",
  "trimOffset",
]);

export const NON_MONOTONIC_EASINGS = new Set<string>([
  "bouncy",
  "elastic",
  "overshoot",
]);

/**
 * Checks whether an easing curve is mathematically safe for a specific property channel.
 */
export function isEasingCompatibleWithChannel(channel: string, easing: string): boolean {
  if (MONOTONIC_ONLY_CHANNELS.has(channel)) {
    return !NON_MONOTONIC_EASINGS.has(easing);
  }
  return true;
}

/**
 * Text-only presets that require typographic glyphs or strings.
 */
const TEXT_ONLY_PRESETS = new Set([
  "typewriter",
  "baselineReveal",
  "counterRoll",
]);

/**
 * Presets that make no physical sense on a 1D vector line.
 */
const INVALID_LINE_PRESETS = new Set([
  "circleIris",
  "circleReveal",
  "jellySquash",
  "typewriter",
  "baselineReveal",
  "heartbeat",
]);

/**
 * Checks whether an animation preset is physically and aesthetically valid for a layer type.
 */
export function isPresetCompatibleWithLayer(preset: string, layerType: string): boolean {
  const isTextLayer = layerType === "text" || layerType === "chunk" || layerType === "counter";
  const isLineLayer = layerType === "line";

  if (TEXT_ONLY_PRESETS.has(preset) && !isTextLayer) {
    return false;
  }

  if (isLineLayer && INVALID_LINE_PRESETS.has(preset)) {
    return false;
  }

  return true;
}

/**
 * Self-healing sanitizer for animation requests from AI agents or UI presets.
 * Returns a clamped, physically valid preset and easing with explanatory notices if auto-corrected.
 */
export function sanitizeAnimationForLayer(
  layerType: string,
  preset: string,
  easing: string = "smooth",
  channel?: string
): {
  preset: string;
  easing: string;
  notices: string[];
} {
  const notices: string[] = [];
  let sanitizedPreset = preset;
  let sanitizedEasing = easing;

  // 1. Validate preset compatibility
  if (!isPresetCompatibleWithLayer(preset, layerType)) {
    if (layerType === "line") {
      sanitizedPreset = "slideRight";
      notices.push(
        `Animation preset '${preset}' is invalid for 1D line layers; auto-corrected to 'slideRight'.`
      );
    } else {
      sanitizedPreset = "fade";
      notices.push(
        `Typographic preset '${preset}' cannot be applied to non-text layer type '${layerType}'; auto-corrected to 'fade'.`
      );
    }
  }

  // 2. Validate easing monotonic boundary
  const effectiveChannel = channel || (sanitizedPreset === "fade" || sanitizedPreset === "fadeIn" || sanitizedPreset === "fadeOut" ? "opacity" : undefined);
  if (effectiveChannel && !isEasingCompatibleWithChannel(effectiveChannel, sanitizedEasing)) {
    sanitizedEasing = "smooth";
    notices.push(
      `Easing '${easing}' overshoots boundaries for channel '${effectiveChannel}'; clamped to monotonic 'smooth'.`
    );
  }

  return {
    preset: sanitizedPreset,
    easing: sanitizedEasing,
    notices,
  };
}
