import { useProjectStore, findLayerInTree } from "@/store/useProjectStore";
import { LayerAnimation, AnimationConfig } from "@/types/scene";
import { ApplyAnimationInput, ApplyAnimationInputSchema, ToolResult } from "@/types/agentTools";
import { sanitizeAnimationForLayer } from "@/engine/physics/animationGuardrails";

/**
 * Self-healing Agent Tool: apply_animation.
 * Applies motion presets (pop, fade, slide, scale, boil, etc.) and physical easings to an element.
 */
export function applyAnimation(
  rawInput: ApplyAnimationInput,
  targetStore = useProjectStore
): ToolResult<{ layerId: string; animation: LayerAnimation }> {
  const notices: string[] = [];

  // 1. Zod schema validation with safe fallback
  const parseResult = ApplyAnimationInputSchema.safeParse(rawInput);
  const input = parseResult.success ? parseResult.data : rawInput;

  if (!parseResult.success) {
    notices.push(`Input warnings: ${parseResult.error.issues.map((i) => i.message).join("; ")}`);
  }

  const state = targetStore.getState();
  const targetScreenId = input.sceneId || state.activeScreenId || state.document.screens[0]?.id;
  const targetScreen = state.document.screens.find((s) => s.id === targetScreenId);

  if (!targetScreen) {
    return {
      success: false,
      error: `Scene with ID "${targetScreenId}" not found.`,
      notices,
    };
  }

  const targetLayer = findLayerInTree(targetScreen.layers, input.layerId);
  if (!targetLayer) {
    return {
      success: false,
      error: `Layer with ID "${input.layerId}" not found in scene "${targetScreen.name}".`,
      notices,
    };
  }

  const currentAnim: LayerAnimation = targetLayer.animation || {};
  let currentClips = [...(currentAnim.clips || [])];
  if (input.mode === "replace") {
    currentClips = [];
  }

  const clipsToAdd: any[] = [];

  if (Array.isArray(input.animations) && input.animations.length > 0) {
    for (const anim of input.animations) {
      let dur = typeof anim.duration === "number" ? anim.duration : 0.6;
      if (dur < 0.05) dur = 0.05;
      else if (dur > 10.0) dur = 10.0;

      const sanitized = sanitizeAnimationForLayer(
        targetLayer.type,
        anim.preset,
        (anim.easing as any) || "snappy"
      );
      if (sanitized.notices.length > 0) {
        notices.push(...sanitized.notices);
      }

      const role = anim.type || anim.target || "in";
      const startOffset = anim.start !== undefined ? anim.start : (anim.delay ?? 0);
      const clipId = anim.id || `clip_${Math.random().toString(36).slice(2, 8)}`;

      clipsToAdd.push({
        id: clipId,
        name: `${sanitized.preset} ${role}`,
        type: role,
        preset: sanitized.preset,
        start: startOffset,
        duration: dur,
        easing: sanitized.easing,
        direction: anim.direction,
        loop: anim.loop,
        loopCount: anim.loopCount,
        fillMode: anim.fillMode || (role === "action" ? "forwards" : "none"),
        splitBy: anim.splitBy,
        stagger: anim.stagger,
        params: anim.params,
        spring: anim.spring,
      });
    }
  } else if (input.preset) {
    // 2. Duration Auto-Clamping (Self-Healing)
    let duration = typeof input.duration === "number" ? input.duration : 0.6;
    if (duration < 0.05) {
      notices.push(`Animation duration (${duration}s) below minimum 0.05s; clamped to 0.05s.`);
      duration = 0.05;
    } else if (duration > 10.0) {
      notices.push(`Animation duration (${duration}s) above maximum 10.0s; clamped to 10.0s.`);
      duration = 10.0;
    }

    // 3. Physical & Semantic Compatibility Guardrails
    const sanitized = sanitizeAnimationForLayer(
      targetLayer.type,
      input.preset,
      (input.easing as any) || "snappy"
    );
    if (sanitized.notices.length > 0) {
      notices.push(...sanitized.notices);
    }

    const role = input.type || input.target || "in";
    const startOffset = input.start !== undefined ? input.start : (input.delay ?? 0);
    const clipId = `clip_${Math.random().toString(36).slice(2, 8)}`;

    clipsToAdd.push({
      id: clipId,
      name: `${sanitized.preset} ${role}`,
      type: role,
      preset: sanitized.preset,
      start: startOffset,
      duration,
      easing: sanitized.easing,
      direction: input.direction,
      loop: input.loop,
      loopCount: input.loopCount,
      fillMode: input.fillMode || (role === "action" ? "forwards" : "none"),
      splitBy: input.splitBy,
      stagger: input.stagger,
      params: input.params,
      spring: input.spring,
    });
  }

  // Combine clips
  const nextClips = [...currentClips, ...clipsToAdd].sort((a, b) => a.start - b.start);

  const updatedAnim: LayerAnimation = {
    ...currentAnim,
    clips: nextClips,
  };

  // Sync legacy slots for backward compatibility
  const inClip = nextClips.find((c) => c.type === "in");
  if (inClip) {
    updatedAnim.in = {
      preset: inClip.preset,
      duration: inClip.duration,
      start: inClip.start,
      easing: inClip.easing as any,
      direction: inClip.direction,
      springStiffness: inClip.spring?.stiffness,
      springDamping: inClip.spring?.damping,
    };
  }
  const outClip = nextClips.find((c) => c.type === "out");
  if (outClip) {
    updatedAnim.out = {
      preset: outClip.preset,
      duration: outClip.duration,
      start: outClip.start,
      easing: outClip.easing as any,
      direction: outClip.direction,
      springStiffness: outClip.spring?.stiffness,
      springDamping: outClip.spring?.damping,
    };
  }

  // Mutate Store
  state.updateLayerAnimation(targetLayer.id, updatedAnim);

  return {
    success: true,
    data: { layerId: targetLayer.id, animation: updatedAnim },
    notices,
  };
}
