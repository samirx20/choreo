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

  // 4. Construct Animation Action
  const action: AnimationConfig = {
    preset: sanitized.preset,
    duration,
    start: input.delay ?? 0,
    easing: sanitized.easing as any,
    direction: input.direction,
    springStiffness: input.spring?.stiffness,
    springDamping: input.spring?.damping,
  };

  const currentAnim: LayerAnimation = targetLayer.animation || {};
  const updatedAnim: LayerAnimation = {
    ...currentAnim,
    [input.target || "in"]: action,
  };

  // 4. Mutate Store
  state.updateLayerAnimation(targetLayer.id, updatedAnim);

  return {
    success: true,
    data: { layerId: targetLayer.id, animation: updatedAnim },
    notices,
  };
}
