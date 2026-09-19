import { describe, it, expect, beforeEach } from "vitest";
import { useProjectStore } from "../store/useProjectStore";
import { compoundLayerAnimations, evaluateClipDelta } from "../engine/evaluator";
import { AnimationClip, Layer, getLayerClips } from "../types/scene";

describe("Multi-Animation Compounding & Store Multi-Clip Suite", () => {
  beforeEach(() => {
    useProjectStore.getState().resetProject();
  });

  it("evaluates clip delta for in, out, and emphasis correctly", () => {
    const inClip: AnimationClip = {
      id: "c_in",
      type: "in",
      preset: "pop",
      start: 0,
      duration: 1.0,
      easing: "smooth",
      fillMode: "both",
    };
    const deltaStart = evaluateClipDelta(inClip, 0.0);
    expect(deltaStart.scaleX).toBeCloseTo(0, 1);
    expect(deltaStart.opacity).toBeCloseTo(0, 1);

    const deltaEnd = evaluateClipDelta(inClip, 1.0);
    expect(deltaEnd.scaleX).toBeCloseTo(1, 1);
    expect(deltaEnd.opacity).toBeCloseTo(1, 1);

    const outClip: AnimationClip = {
      id: "c_out",
      type: "out",
      preset: "fade",
      start: 3.0,
      duration: 1.0,
      easing: "smooth",
      fillMode: "both",
    };
    const deltaBeforeOut = evaluateClipDelta(outClip, 2.5);
    expect(deltaBeforeOut.opacity).toBe(1);

    const deltaAfterOut = evaluateClipDelta(outClip, 4.0);
    expect(deltaAfterOut.opacity).toBeCloseTo(0, 1);
  });

  it("compounds multiple overlapping and sequential animation clips on a base layer", () => {
    const baseLayer: Layer = {
      id: "text_layer_1",
      name: "Title",
      type: "text",
      content: "Hello Choreo",
      style: {
        x: 100,
        y: 200,
        width: 300,
        height: 60,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
        opacity: 1,
      },
      animation: {
        clips: [
          {
            id: "clip_1",
            type: "in",
            preset: "pop",
            start: 0,
            duration: 1,
            easing: "smooth",
            fillMode: "both",
          },
          {
            id: "clip_2",
            type: "action",
            preset: "pulse",
            start: 1.5,
            duration: 0.5,
            easing: "smooth",
            fillMode: "both",
            scaleAmount: 1.2,
          },
          {
            id: "clip_3",
            type: "out",
            preset: "slideDown",
            start: 3.0,
            duration: 1,
            easing: "smooth",
            fillMode: "both",
          },
        ],
      },
    };

    // Before or at start: Pop in at t=0
    const stateAt0 = compoundLayerAnimations(baseLayer, 0);
    expect(stateAt0.opacity).toBeCloseTo(0, 1);

    // After pop in finishes: t=1.2
    const stateAt1_2 = compoundLayerAnimations(baseLayer, 1.2);
    expect(stateAt1_2.opacity).toBe(1);
    expect(stateAt1_2.transform.scaleX).toBe(1);

    // During pulse: t=1.75 (peak of pulse)
    const stateAt1_75 = compoundLayerAnimations(baseLayer, 1.75);
    expect(stateAt1_75.transform.scaleX).toBeGreaterThan(1.05);

    // During exit: t=3.5
    const stateAt3_5 = compoundLayerAnimations(baseLayer, 3.5);
    expect(stateAt3_5.transform.y).not.toBe(0);
    expect(stateAt3_5.opacity).toBeLessThan(1);

    // After exit completes: t=4.0
    const stateAt4 = compoundLayerAnimations(baseLayer, 4.0);
    expect(stateAt4.opacity).toBeCloseTo(0, 1);
  });

  it("allows adding, updating, duplicating, reordering, and splitting animation clips via useProjectStore", () => {
    const store = useProjectStore.getState();
    const testLayer: Layer = {
      id: "l_test",
      name: "Test Layer",
      type: "text",
      content: "Choreo Multi-Clip",
      style: { x: 50, y: 50, width: 200, height: 40, rotation: 0, opacity: 1 },
    };
    store.addLayer(testLayer);

    // 1. Add clips
    const clip1Id = store.addAnimationClip("l_test", {
      type: "in",
      preset: "slideUp",
      start: 0,
      duration: 0.8,
    });
    expect(clip1Id).toBeTruthy();

    const clip2Id = store.addAnimationClip("l_test", {
      type: "action",
      preset: "pulse",
      start: 1.2,
      duration: 0.6,
    });
    expect(clip2Id).toBeTruthy();

    let layer = useProjectStore.getState().document.screens[0].layers.find((l) => l.id === "l_test")!;
    let clips = getLayerClips(layer);
    expect(clips.length).toBe(2);
    expect(clips[0].id).toBe(clip1Id);
    expect(clips[1].id).toBe(clip2Id);
    expect(layer.animation?.in?.preset).toBe("slideUp");

    // 2. Update clip
    store.updateAnimationClip("l_test", clip2Id, {
      duration: 1.0,
      preset: "shimmer",
    });
    layer = useProjectStore.getState().document.screens[0].layers.find((l) => l.id === "l_test")!;
    clips = getLayerClips(layer);
    const updatedClip2 = clips.find((c) => c.id === clip2Id)!;
    expect(updatedClip2.duration).toBe(1.0);
    expect(updatedClip2.preset).toBe("shimmer");

    // 3. Duplicate clip
    const dupId = store.duplicateAnimationClip("l_test", clip2Id);
    expect(dupId).toBeTruthy();
    layer = useProjectStore.getState().document.screens[0].layers.find((l) => l.id === "l_test")!;
    clips = getLayerClips(layer);
    expect(clips.length).toBe(3);

    // 4. Split clip
    store.splitAnimationClip("l_test", clip1Id, 0.4);
    layer = useProjectStore.getState().document.screens[0].layers.find((l) => l.id === "l_test")!;
    clips = getLayerClips(layer);
    expect(clips.length).toBe(4);
    const head = clips.find((c) => c.id === clip1Id)!;
    expect(head.duration).toBeCloseTo(0.4, 2);

    // 5. Remove clip
    store.removeAnimationClip("l_test", dupId);
    layer = useProjectStore.getState().document.screens[0].layers.find((l) => l.id === "l_test")!;
    clips = getLayerClips(layer);
    expect(clips.length).toBe(3);
    expect(clips.some((c) => c.id === dupId)).toBe(false);

    // 6. Reorder clips
    const originalOrder = clips.map((c) => c.id);
    const reversedOrder = [...originalOrder].reverse();
    store.reorderAnimationClips("l_test", reversedOrder);
    layer = useProjectStore.getState().document.screens[0].layers.find((l) => l.id === "l_test")!;
    clips = getLayerClips(layer);
    expect(clips.map((c) => c.id)).toEqual(reversedOrder);
  });
});
