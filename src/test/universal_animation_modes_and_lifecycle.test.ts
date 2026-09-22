import { describe, it, expect, beforeEach } from "vitest";
import { useProjectStore, INITIAL_SCENE } from "@/store/useProjectStore";
import { Layer } from "@/types/scene";
import { compoundLayerAnimations } from "@/engine/evaluator/clipEvaluator";

describe("Universal Animation Roles (In | Action | Out) & Element Lifecycle", () => {
  beforeEach(() => {
    useProjectStore.setState({
      activeScreenId: "screen_1",
      document: {
        ...INITIAL_SCENE,
        screens: [
          {
            id: "screen_1",
            name: "Scene 1",
            duration: 8.0,
            layers: [
              {
                id: "plus_icon_layer",
                type: "icon",
                name: "Plus",
                style: {
                  x: 500,
                  y: 500,
                  width: 64,
                  height: 64,
                  opacity: 1,
                  scaleX: 1,
                  scaleY: 1,
                  rotation: 0,
                },
                animation: {
                  clips: [
                    {
                      id: "clip_scale_entrance",
                      preset: "custom_scale",
                      name: "Scale",
                      type: "in",
                      start: 2.1,
                      duration: 0.8,
                      easing: "smooth",
                      from: { scale: 0 },
                      params: { scaleAmount: 1.0 },
                    },
                  ],
                },
              } as unknown as Layer,
            ],
          },
        ],
      },
    });
  });

  it("guarantees pre-entrance invisibility (opacity 0) when an In animation starts later in the timeline", () => {
    const layer = useProjectStore.getState().document.screens[0].layers[0];

    // At t = 0.0s (scrubber before clip start 2.1s): MUST be completely invisible!
    const atZero = compoundLayerAnimations(layer, 0.0);
    expect(atZero.opacity).toBe(0);

    // At t = 1.5s (still before 2.1s): MUST remain completely invisible!
    const atOnePointFive = compoundLayerAnimations(layer, 1.5);
    expect(atOnePointFive.opacity).toBe(0);

    // At t = 2.5s (midway through entrance): active interpolation
    const midEntrance = compoundLayerAnimations(layer, 2.5);
    expect(midEntrance.opacity).toBeGreaterThan(0);
    expect(midEntrance.transform.scaleX).toBeGreaterThan(0);

    // At t = 3.5s (after entrance completes): fully visible on screen!
    const postEntrance = compoundLayerAnimations(layer, 3.5);
    expect(postEntrance.opacity).toBe(1);
    expect(postEntrance.transform.scaleX).toBe(1);
  });

  it("allows switching an animation to 'action', making the element visible on canvas from t = 0s", () => {
    const store = useProjectStore.getState();
    const layer = store.document.screens[0].layers[0];

    // Switch clip to action
    store.updateAnimationClip(layer.id, "clip_scale_entrance", {
      type: "action",
      from: { scale: 1.0 },
      params: { scaleAmount: 1.3 },
    });

    const updatedLayer = useProjectStore.getState().document.screens[0].layers[0];

    // At t = 0.0s: Since it's an action, element is already visible on screen!
    const atZero = compoundLayerAnimations(updatedLayer, 0.0);
    expect(atZero.opacity).toBe(1);
    expect(atZero.transform.scaleX).toBe(1);

    // At t = 3.0s (after action duration 0.8s from 2.1s): holds target scale
    const postAction = compoundLayerAnimations(updatedLayer, 3.0);
    expect(postAction.opacity).toBe(1);
    expect(postAction.transform.scaleX).toBeCloseTo(1.3, 1);
  });

  it("allows switching an animation to 'out', making the element permanently invisible (opacity 0) after completion", () => {
    const store = useProjectStore.getState();
    const layer = store.document.screens[0].layers[0];

    // Switch clip to out (exit) at t = 2.1s, duration 0.8s (ends at 2.9s)
    store.updateAnimationClip(layer.id, "clip_scale_entrance", {
      type: "out",
      from: { scale: 1.0 },
      params: { scaleAmount: 0 },
    });

    const updatedLayer = useProjectStore.getState().document.screens[0].layers[0];

    // At t = 0.0s (before exit): visible on canvas!
    const atZero = compoundLayerAnimations(updatedLayer, 0.0);
    expect(atZero.opacity).toBe(1);

    // At t = 3.5s (after exit ends at 2.9s): MUST be completely invisible!
    const postExit = compoundLayerAnimations(updatedLayer, 3.5);
    expect(postExit.opacity).toBe(0);
  });

  it("supports chaining In, Action, and Out clips on a single layer", () => {
    const store = useProjectStore.getState();
    const layerId = "plus_icon_layer";

    // Setup full 3-phase lifecycle:
    // In: 1.0s -> 1.5s
    // Action: 2.5s -> 3.0s
    // Out: 4.5s -> 5.0s
    store.updateAnimationClip(layerId, "clip_scale_entrance", {
      type: "in",
      start: 1.0,
      duration: 0.5,
    });

    store.addAnimationClip(layerId, {
      name: "Pulse Action",
      preset: "pulse",
      type: "action",
      start: 2.5,
      duration: 0.5,
      easing: "smooth",
    });

    store.addAnimationClip(layerId, {
      name: "Fade Out",
      preset: "fade",
      type: "out",
      start: 4.5,
      duration: 0.5,
      easing: "smooth",
    });

    const layer = useProjectStore.getState().document.screens[0].layers[0];

    // 1. Before In (t = 0.5s): Opacity 0
    expect(compoundLayerAnimations(layer, 0.5).opacity).toBe(0);

    // 2. Between In and Out (t = 2.0s): Opacity 1 (Resting on screen)
    expect(compoundLayerAnimations(layer, 2.0).opacity).toBe(1);

    // 3. During Action (t = 2.75s): Visible and animated
    const inAction = compoundLayerAnimations(layer, 2.75);
    expect(inAction.opacity).toBe(1);

    // 4. After Out (t = 5.5s): Opacity 0 (Exited the screen)
    expect(compoundLayerAnimations(layer, 5.5).opacity).toBe(0);
  });

  it("filters out invalid non-monotonic physics easings (elastic, bounce, overshoot) for optical properties", async () => {
    const { JITTER_EASINGS, OPTICAL_EASING_IDS } = await import(
      "@/components/inspector/motion/JitterEasingPopover"
    );

    // Optical easings must contain monotonic curves: smooth, natural, slowDown, accelerate, linear
    expect(OPTICAL_EASING_IDS).toEqual(["smooth", "natural", "slowDown", "accelerate", "linear"]);

    // Bounded optical properties MUST NEVER have elastic, bounce, or overshoot
    expect(OPTICAL_EASING_IDS.includes("elastic" as any)).toBe(false);
    expect(OPTICAL_EASING_IDS.includes("bounce" as any)).toBe(false);
    expect(OPTICAL_EASING_IDS.includes("overshoot" as any)).toBe(false);

    // Full spatial transforms have all 8 easings available
    expect(JITTER_EASINGS.map((e) => e.id)).toEqual([
      "smooth",
      "natural",
      "slowDown",
      "accelerate",
      "elastic",
      "bounce",
      "overshoot",
      "linear",
    ]);
  });
});
