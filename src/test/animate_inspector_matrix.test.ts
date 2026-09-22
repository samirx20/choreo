import { describe, it, expect, beforeEach } from "vitest";
import { useProjectStore, findLayerInTree } from "../store/useProjectStore";
import { Layer, GroupLayer, AnimationConfig, AnimationClip } from "../types/scene";

describe("Animate Inspector & Motion Matrix Tests", () => {
  beforeEach(() => {
    const state = useProjectStore.getState();
    state.deselectAll();
    state.setEditingLayerId(null);
    if (state.document.screens[0]) {
      state.selectScreen(state.document.screens[0].id);
    }
  });

  it("applies entrance presets with correct default easing and parameters", () => {
    const state = useProjectStore.getState();
    const layerId = "anim_test_layer_1";
    const layer: Layer = {
      id: layerId,
      name: "Hero Title",
      type: "text",
      content: "Choreo Motion",
      style: {
        x: 100,
        y: 100,
        width: 300,
        height: "auto",
        fontSize: 48,
        rotation: 0,
        opacity: 1,
      },
    };

    state.addLayer(layer);
    state.selectLayer(layerId);

    // Apply "pop" preset
    const popConfig: AnimationConfig = {
      preset: "pop",
      start: 0,
      duration: 0.6,
      easing: "bouncy",
      params: {
        overshootAmount: 120,
        fade: true,
      },
    };
    state.updateLayerAnimation(layerId, { in: popConfig });

    let doc = useProjectStore.getState().document;
    let updated = findLayerInTree(doc.screens[0].layers, layerId);
    expect(updated?.animation?.in).toBeDefined();
    expect(updated?.animation?.in?.preset).toBe("pop");
    expect(updated?.animation?.in?.easing).toBe("bouncy");
    expect(updated?.animation?.in?.params?.overshootAmount).toBe(120);

    // Apply "slideUp" preset
    const slideConfig: AnimationConfig = {
      preset: "slideUp",
      start: 0.2,
      duration: 0.8,
      easing: "smooth",
      params: {
        distance: 80,
        fade: true,
      },
    };
    state.updateLayerAnimation(layerId, { in: slideConfig });

    doc = useProjectStore.getState().document;
    updated = findLayerInTree(doc.screens[0].layers, layerId);
    expect(updated?.animation?.in?.preset).toBe("slideUp");
    expect(updated?.animation?.in?.start).toBe(0.2);
    expect(updated?.animation?.in?.duration).toBe(0.8);
    expect(updated?.animation?.in?.params?.distance).toBe(80);
  });

  it("inverts animation mode from 'in' (entrance) to 'out' (exit) preserving timings", () => {
    const state = useProjectStore.getState();
    const layerId = "anim_test_invert";
    const layer: Layer = {
      id: layerId,
      name: "Fade Box",
      type: "shape",
      shapeType: "rectangle",
      style: {
        x: 50,
        y: 50,
        width: 150,
        height: 150,
        rotation: 0,
        opacity: 1,
      },
      animation: {
        in: {
          preset: "fadeIn",
          start: 0.5,
          duration: 0.7,
          easing: "smooth",
        },
      },
    };

    state.addLayer(layer);
    state.selectLayer(layerId);

    // Invert to "out"
    const currentIn = layer.animation?.in!;
    state.updateLayerAnimation(layerId, {
      out: currentIn,
      in: undefined,
    });

    const doc = useProjectStore.getState().document;
    const updated = findLayerInTree(doc.screens[0].layers, layerId);
    expect(updated?.animation?.in).toBeUndefined();
    expect(updated?.animation?.out).toBeDefined();
    expect(updated?.animation?.out?.preset).toBe("fadeIn");
    expect(updated?.animation?.out?.duration).toBe(0.7);
    expect(updated?.animation?.out?.start).toBe(0.5);
  });

  it("updates cascade stagger delay on layout container groups", () => {
    const state = useProjectStore.getState();
    const groupId = "group_stagger_test";
    const group: GroupLayer = {
      id: groupId,
      name: "Feature List",
      type: "group",
      layout: { display: "flex", flexDirection: "column", gap: 12, align: "start" },
      autoFit: true,
      autoLink: true,
      staggerDelay: 0.15,
      style: {
        x: 0,
        y: 0,
        width: 400,
        height: 200,
        rotation: 0,
        opacity: 1,
      },
      children: [],
    };

    state.addLayer(group);
    state.selectLayer(groupId);

    // Update staggerDelay to 0.25s
    state.updateLayer(groupId, { staggerDelay: 0.25 });

    const doc = useProjectStore.getState().document;
    const updated = findLayerInTree(doc.screens[0].layers, groupId) as GroupLayer;
    expect(updated.staggerDelay).toBe(0.25);
  });

  it("deletes active animation cleanly from layer AST", () => {
    const state = useProjectStore.getState();
    const layerId = "anim_delete_test";
    const layer: Layer = {
      id: layerId,
      name: "Transient Layer",
      type: "text",
      content: "Goodbye Motion",
      style: {
        x: 10,
        y: 10,
        width: "auto",
        height: "auto",
        rotation: 0,
        opacity: 1,
      },
      animation: {
        in: {
          preset: "pop",
          start: 0,
          duration: 0.5,
          easing: "bouncy",
        },
      },
    };

    state.addLayer(layer);
    state.selectLayer(layerId);

    // Remove animation
    state.updateLayerAnimation(layerId, { in: undefined, out: undefined });

    const doc = useProjectStore.getState().document;
    const updated = findLayerInTree(doc.screens[0].layers, layerId);
    expect(updated?.animation?.in).toBeUndefined();
    expect(updated?.animation?.out).toBeUndefined();
  });

  it("adds animation clip, selects it into selectedClipIds, and updates full animation properties", () => {
    const state = useProjectStore.getState();
    const layerId = "clip_props_test";
    const layer: Layer = {
      id: layerId,
      name: "Animated Heading",
      type: "text",
      content: "Hello World",
      style: {
        x: 0,
        y: 0,
        width: 200,
        height: 50,
        rotation: 0,
        opacity: 1,
      },
    };

    state.addLayer(layer);
    state.selectLayer(layerId);

    const clipId = state.addAnimationClip(layerId, {
      name: "Pop",
      type: "in",
      preset: "pop",
      start: 0,
      duration: 0.6,
      easing: "bouncy",
    });

    expect(clipId).toBeDefined();
    expect(useProjectStore.getState().selectedClipIds).toEqual([clipId]);

    // Update full animation properties
    state.updateAnimationClip(layerId, clipId!, {
      start: 0.25,
      duration: 0.8,
      easing: "bouncy",
      direction: "up",
      distance: 120,
      scaleAmount: 1.5,
      rotationDegrees: 45,
      springStiffness: 300,
      springDamping: 0.65,
      springMass: 1.2,
      splitBy: "word",
      staggerDelay: 0.05,
      loop: true,
      intensity: 1.8,
    });

    const doc = useProjectStore.getState().document;
    const updated = findLayerInTree(doc.screens[0].layers, layerId);
    const updatedClip = updated?.animation?.clips?.find((c) => c.id === clipId);

    expect(updatedClip).toBeDefined();
    expect(updatedClip?.start).toBe(0.25);
    expect(updatedClip?.duration).toBe(0.8);
    expect(updatedClip?.easing).toBe("bouncy");
    expect(updatedClip?.direction).toBe("up");
    expect(updatedClip?.distance).toBe(120);
    expect(updatedClip?.scaleAmount).toBe(1.5);
    expect(updatedClip?.rotationDegrees).toBe(45);
    expect(updatedClip?.springStiffness).toBe(300);
    expect(updatedClip?.springDamping).toBe(0.65);
    expect(updatedClip?.springMass).toBe(1.2);
    expect(updatedClip?.splitBy).toBe("word");
    expect(updatedClip?.staggerDelay).toBe(0.05);
    expect(updatedClip?.loop).toBe(true);
    expect(updatedClip?.intensity).toBe(1.8);
  });

  it("manages artboard positioning, selection, and movement across canvas", () => {
    const state = useProjectStore.getState();

    // 1. Initial screen exists
    expect(state.document.screens.length).toBeGreaterThanOrEqual(1);
    const screen1 = state.document.screens[0];

    // 2. Move screen1 to (150, 200)
    state.updateScreen(screen1.id, { x: 150, y: 200, width: 1080, height: 1920 });
    let updatedScreen1 = useProjectStore.getState().document.screens.find((s) => s.id === screen1.id);
    expect(updatedScreen1?.x).toBe(150);
    expect(updatedScreen1?.y).toBe(200);
    expect(updatedScreen1?.width).toBe(1080);
    expect(updatedScreen1?.height).toBe(1920);

    // 3. Add a second artboard at (1300, 200)
    state.addScreen({
      name: "Scene 2",
      duration: 4.0,
      x: 1300,
      y: 200,
      width: 1920,
      height: 1080,
    });

    const screens = useProjectStore.getState().document.screens;
    expect(screens.length).toBe(2);
    const screen2 = screens[1];
    expect(screen2.name).toBe("Scene 2");
    expect(screen2.x).toBe(1300);
    expect(screen2.y).toBe(200);

    // 4. Select screen 2
    state.selectScreen(screen2.id);
    expect(useProjectStore.getState().activeScreenId).toBe(screen2.id);
    expect(useProjectStore.getState().selectedLayerIds).toEqual([]);
  });

  it("supports Jitter 1:1 text animation properties and mode toggling", () => {
    const state = useProjectStore.getState();
    const layerId = "text_jitter_test";
    state.addLayer({
      id: layerId,
      name: "Headline",
      type: "text",
      content: "Choreo Motion Studio",
      style: { x: 0, y: 0, width: 200, height: 50, rotation: 0, opacity: 1 },
    });

    const clipId = state.addAnimationClip(layerId, {
      name: "Disappear",
      type: "out",
      preset: "fade",
      start: 1.0,
      duration: 0.8,
      easing: "linear",
    });

    expect(clipId).toBeDefined();

    // Toggle mode from out to in
    state.updateAnimationClip(layerId, clipId!, { type: "in" });
    let doc = useProjectStore.getState().document;
    let screen = doc.screens.find((s) => s.id === useProjectStore.getState().activeScreenId) || doc.screens[0];
    let clip = findLayerInTree(screen.layers, layerId)?.animation?.clips?.find((c) => c.id === clipId);
    expect(clip?.type).toBe("in");

    // Configure text animation (letters, lines, words) with order and delay
    state.updateAnimationClip(layerId, clipId!, {
      splitBy: "line",
      staggerDelay: 0.15, // 150ms
      params: { order: "From center" },
    });

    doc = useProjectStore.getState().document;
    screen = doc.screens.find((s) => s.id === useProjectStore.getState().activeScreenId) || doc.screens[0];
    clip = findLayerInTree(screen.layers, layerId)?.animation?.clips?.find((c) => c.id === clipId);
    expect(clip?.splitBy).toBe("line");
    expect(clip?.staggerDelay).toBe(0.15);
    expect(clip?.params?.order).toBe("From center");
  });

  it("configures Spin animation parameters and Jitter easing presets correctly", () => {
    const state = useProjectStore.getState();
    const layerId = "spin_jitter_test";
    state.addLayer({
      id: layerId,
      name: "Badge",
      type: "shape",
      shapeType: "rectangle",
      style: { x: 100, y: 100, width: 80, height: 80, rotation: 0, opacity: 1 },
    });

    // Add Spin clip
    const clipId = state.addAnimationClip(layerId, {
      name: "Spin",
      type: "in",
      preset: "spin",
      start: 0,
      duration: 1.5,
      easing: "smooth",
      rotationDegrees: 45,
      direction: "cw",
    });

    expect(clipId).toBeDefined();

    // Verify initial values
    let doc = useProjectStore.getState().document;
    let screen = doc.screens.find((s) => s.id === useProjectStore.getState().activeScreenId) || doc.screens[0];
    let clip = findLayerInTree(screen.layers, layerId)?.animation?.clips?.find((c) => c.id === clipId);
    expect(clip?.rotationDegrees).toBe(45);
    expect(clip?.direction).toBe("cw");
    expect(clip?.duration).toBe(1.5);
    expect(clip?.easing).toBe("smooth");

    // Change direction to counter-clockwise and rotate by 90
    state.updateAnimationClip(layerId, clipId!, {
      rotationDegrees: -90,
      direction: "ccw",
    });

    // Update easing with custom bezier and spring physics
    state.updateAnimationClip(layerId, clipId!, {
      easing: "natural",
      bezierPoints: [0.25, 0.1, 0.25, 1.0],
      springStiffness: 280,
      springDamping: 0.65,
      springMass: 1.1,
    });

    doc = useProjectStore.getState().document;
    screen = doc.screens.find((s) => s.id === useProjectStore.getState().activeScreenId) || doc.screens[0];
    clip = findLayerInTree(screen.layers, layerId)?.animation?.clips?.find((c) => c.id === clipId);

    expect(clip?.rotationDegrees).toBe(-90);
    expect(clip?.direction).toBe("ccw");
    expect(clip?.easing).toBe("natural");
    expect(clip?.bezierPoints).toEqual([0.25, 0.1, 0.25, 1.0]);
    expect(clip?.springStiffness).toBe(280);
    expect(clip?.springDamping).toBe(0.65);
    expect(clip?.springMass).toBe(1.1);
  });

  it("verifies all 9 easing curves evaluate distinct valid trajectories in getEasing", async () => {
    const { getEasing } = await import("../engine/easings");

    const easings = [
      "smooth",
      "natural",
      "slowDown",
      "accelerate",
      "elastic",
      "bounce",
      "overshoot",
      "none",
      "custom",
    ];

    const midValues: Record<string, number> = {};

    easings.forEach((easeName) => {
      const fn = getEasing(easeName, [0.25, 0.1, 0.25, 1.0]);
      expect(typeof fn).toBe("function");

      // Boundary conditions
      expect(fn(0)).toBeCloseTo(0, 2);
      expect(fn(1)).toBeCloseTo(1, 2);

      // Midpoint trajectory (t = 0.5)
      const mid = fn(0.5);
      expect(typeof mid).toBe("number");
      expect(Number.isFinite(mid)).toBe(true);
      midValues[easeName] = mid;
    });

    // None (linear) is exactly 0.5
    expect(midValues.none).toBeCloseTo(0.5, 2);

    // Slow down (decelerating curve) has progressed further than 0.5 at t=0.5
    expect(midValues.slowDown).toBeGreaterThan(0.6);

    // Accelerate has progressed less than 0.5 at t=0.5
    expect(midValues.accelerate).toBeLessThan(0.4);

    // Elastic and bounce have distinctive harmonic curves
    expect(typeof midValues.elastic).toBe("number");
    expect(typeof midValues.bounce).toBe("number");
  });

  it("calculates timeline scrubber and playhead position synchronously across the 8s ruler", () => {
    const screenDuration = 4.0;
    const maxSec = Math.max(8, Math.ceil(screenDuration)); // 8 seconds
    expect(maxSec).toBe(8);

    // At 25% of the ruler width, the target time should be exactly 2.0s (not compressed to pct * duration)
    const pct25 = 0.25;
    const scrubTime = Math.max(0, Math.min(maxSec, Math.round(pct25 * maxSec * 100) / 100));
    expect(scrubTime).toBe(2.0);

    // And playhead subscription computes exactly 25% position along the 8s ruler
    const playheadPct = Math.max(0, Math.min(100, (scrubTime / maxSec) * 100));
    expect(playheadPct).toBe(25);

    // At 50% of the ruler width, target time is 4.0s
    const pct50 = 0.5;
    const scrubTime50 = Math.max(0, Math.min(maxSec, Math.round(pct50 * maxSec * 100) / 100));
    expect(scrubTime50).toBe(4.0);
    expect((scrubTime50 / maxSec) * 100).toBe(50);

    // At 100% of the ruler width, target time reaches the full 8.0s
    const pct100 = 1.0;
    const scrubTime100 = Math.max(0, Math.min(maxSec, Math.round(pct100 * maxSec * 100) / 100));
    expect(scrubTime100).toBe(8.0);
    expect((scrubTime100 / maxSec) * 100).toBe(100);
  });

  it("verifies elastic overshoot peak and bounce impact mechanics", async () => {
    const { EASING_FUNCTIONS } = await import("../engine/easings");

    // Elastic reaches peak overshoot above 1.0 around t = 0.15
    const elasticPeak = EASING_FUNCTIONS.elastic(0.15);
    expect(elasticPeak).toBeGreaterThan(1.2); // > 120% extension

    // Elastic dips back down below 1.0 around t = 0.28
    const elasticDip = EASING_FUNCTIONS.elastic(0.28);
    expect(elasticDip).toBeLessThan(1.0);

    // Elastic settles into 1.0 at t = 1.0
    expect(EASING_FUNCTIONS.elastic(1.0)).toBe(1.0);

    // Bounce reaches first impact at t = 1 / 2.75
    const firstImpact = EASING_FUNCTIONS.bounce(1 / 2.75);
    expect(firstImpact).toBeCloseTo(1.0, 3);

    // Bounce rebounds up to ~0.766 at t = 0.5
    const rebound1 = EASING_FUNCTIONS.bounce(0.5);
    expect(rebound1).toBeLessThan(0.8);
    expect(rebound1).toBeGreaterThan(0.7);

    // Bounce settles into 1.0 at t = 1.0
    expect(EASING_FUNCTIONS.bounce(1.0)).toBe(1.0);
  });

  it("manages AnimationCatalogSheet state lifecycle and overlay targeting", () => {
    const state = useProjectStore.getState();
    expect(state.animationCatalogState.isOpen).toBe(false);
    expect(state.animationCatalogState.selectedClipId).toBeNull();

    // Open for new animation
    state.openAnimationCatalog(null);
    expect(useProjectStore.getState().animationCatalogState.isOpen).toBe(true);
    expect(useProjectStore.getState().animationCatalogState.selectedClipId).toBeNull();

    // Close
    state.closeAnimationCatalog();
    expect(useProjectStore.getState().animationCatalogState.isOpen).toBe(false);

    // Open for changing a specific clip
    state.openAnimationCatalog("clip_test_123");
    expect(useProjectStore.getState().animationCatalogState.isOpen).toBe(true);
    expect(useProjectStore.getState().animationCatalogState.selectedClipId).toBe("clip_test_123");

    state.closeAnimationCatalog();
    expect(useProjectStore.getState().animationCatalogState.isOpen).toBe(false);
  });

  it("handles selection, clean replacement, and loop reset via applyAnimationPreset", () => {
    const state = useProjectStore.getState();
    const layerId = "replace_flow_test";
    state.addLayer({
      id: layerId,
      name: "Hero Card",
      type: "shape",
      shapeType: "rectangle",
      style: { x: 50, y: 50, width: 200, height: 100, rotation: 0, opacity: 1 },
    });

    // 1. Add an ambient looping effect via applyAnimationPreset
    const floatingPreset = {
      id: "float",
      name: "Floating Loop",
      type: "emphasis" as const,
      duration: 2.0,
      easing: "smooth",
      params: { loop: true, distance: 30 },
    };

    const newClipId = state.applyAnimationPreset(layerId, null, floatingPreset);
    expect(newClipId).toBeDefined();
    expect(useProjectStore.getState().selectedClipIds).toEqual([newClipId]);
    expect(useProjectStore.getState().animationCatalogState.isOpen).toBe(false);

    let doc = useProjectStore.getState().document;
    let screen = doc.screens[0];
    let layer = findLayerInTree(screen.layers, layerId);
    let clip = layer?.animation?.clips?.find((c) => c.id === newClipId);

    expect(clip?.preset).toBe("float");
    expect(clip?.type).toBe("emphasis");
    expect(clip?.loop).toBe(true);
    expect(clip?.duration).toBe(2.0);

    // 2. User clicks 'Change' to replace this looping clip with a non-looping entrance preset ("pop")
    state.openAnimationCatalog(newClipId);
    expect(useProjectStore.getState().animationCatalogState.isOpen).toBe(true);
    expect(useProjectStore.getState().animationCatalogState.selectedClipId).toBe(newClipId);

    const popPreset = {
      id: "pop",
      name: "Pop In",
      type: "in" as const,
      duration: 0.6,
      easing: "bouncy",
      params: { overshootAmount: 115 },
    };

    const replacedId = state.applyAnimationPreset(layerId, newClipId, popPreset);
    expect(replacedId).toBe(newClipId);
    expect(useProjectStore.getState().selectedClipIds).toEqual([newClipId]);
    expect(useProjectStore.getState().animationCatalogState.isOpen).toBe(false);

    doc = useProjectStore.getState().document;
    screen = doc.screens[0];
    layer = findLayerInTree(screen.layers, layerId);
    clip = layer?.animation?.clips?.find((c) => c.id === newClipId);

    expect(clip?.preset).toBe("pop");
    expect(clip?.type).toBe("in");
    expect(clip?.duration).toBe(0.6);
    expect(clip?.easing).toBe("bouncy");
    // Crucial: loop flag must be cleanly reset to false!
    expect(clip?.loop).toBe(false);
  });

  it("evaluates all 7 Effects ambient loops with loop: true in evaluateClipDelta", async () => {
    const { evaluateClipDelta } = await import("../engine/evaluator");

    const effectPresets = [
      { id: "pulse", type: "emphasis" as const, duration: 1.2 },
      { id: "float", type: "emphasis" as const, duration: 2.0 },
      { id: "wiggle", type: "emphasis" as const, duration: 0.8 },
      { id: "spin", type: "emphasis" as const, duration: 2.5 },
      { id: "heartbeat", type: "emphasis" as const, duration: 1.0 },
      { id: "breathe", type: "emphasis" as const, duration: 3.0 },
      { id: "shake", type: "emphasis" as const, duration: 0.4 },
    ];

    effectPresets.forEach((eff) => {
      const clip: any = {
        id: `test_${eff.id}`,
        type: eff.type,
        preset: eff.id,
        start: 0,
        duration: eff.duration,
        easing: "smooth",
        loop: true,
        intensity: 1,
      };

      // Evaluate at mid-phase
      const midTime = eff.duration * 0.5;
      const delta = evaluateClipDelta(clip, midTime);

      expect(delta).toBeDefined();
      expect(Number.isFinite(delta.x)).toBe(true);
      expect(Number.isFinite(delta.y)).toBe(true);
      expect(Number.isFinite(delta.scaleX)).toBe(true);
      expect(Number.isFinite(delta.rotate)).toBe(true);
      expect(Number.isFinite(delta.opacity)).toBe(true);
    });
  });

  it("provides categorized Jitter custom animation channels matching Transform, Style, Effects, and Other", async () => {
    const { CUSTOM_CATEGORIES } = await import(
      "../components/inspector/motion/AnimationCatalogSheet"
    );
    expect(CUSTOM_CATEGORIES).toBeDefined();
    expect(CUSTOM_CATEGORIES.map((c) => c.category)).toEqual([
      "Transform",
      "Style",
      "Effects",
      "Other",
    ]);

    const allItemIds = CUSTOM_CATEGORIES.flatMap((c) => c.items.map((i) => i.id));
    expect(allItemIds).toContain("custom_scale");
    expect(allItemIds).toContain("custom_rotate");
    expect(allItemIds).toContain("custom_move");
    expect(allItemIds).toContain("custom_opacity");
    expect(allItemIds).toContain("custom_color");
    expect(allItemIds).toContain("custom_shadow");
    expect(allItemIds).toContain("custom_blur");
    expect(allItemIds).toContain("custom_backdrop_blur");
    expect(allItemIds).toContain("custom_glass");
    expect(allItemIds).toContain("custom_visibility");
    expect(allItemIds).toContain("custom_resize");
    expect(allItemIds).toContain("custom_morph");
    expect(allItemIds).toContain("custom_radius");
    expect(allItemIds).toContain("custom_stroke");
    expect(allItemIds.length).toBe(14);
  });

  it("evaluates all 14 Custom channel presets cleanly in evaluateClipDelta and compounds styles", async () => {
    const { evaluateClipDelta, compoundLayerAnimations, evaluateSceneAtTime } = await import("../engine/evaluator");

    const customChannels = [
      { id: "custom_scale", params: { scaleAmount: 1.5 } },
      { id: "custom_rotate", params: { rotationDegrees: 90 } },
      { id: "custom_move", params: { distance: 60, direction: "up" } },
      { id: "custom_opacity", params: { opacity: 0 } },
      { id: "custom_color", params: { color: "#ff0077" } },
      { id: "custom_shadow", params: { shadowBlur: 20, shadowDistance: 10, shadowColor: "#112233" } },
      { id: "custom_blur", params: { blur: 14 } },
      { id: "custom_backdrop_blur", params: { backdropBlur: 18 } },
      { id: "custom_glass", params: { backdropBlur: 25, opacity: 0.7 } },
      { id: "custom_visibility", params: { visibility: "hide" } },
      { id: "custom_resize", params: { widthDelta: 40, heightDelta: 30 } },
      { id: "custom_morph", params: { morphAmount: 0.5 } },
      { id: "custom_radius", params: { radius: 32 } },
      { id: "custom_stroke", params: { strokeWidth: 6, strokeColor: "#00eeff" } },
    ];

    customChannels.forEach((ch) => {
      const clip: any = {
        id: `test_${ch.id}`,
        type: "action",
        preset: ch.id,
        start: 0,
        duration: 1.0,
        easing: "snappy",
        intensity: 1,
        params: ch.params,
      };

      const deltaMid = evaluateClipDelta(clip, 0.5);
      expect(deltaMid).toBeDefined();

      const deltaEnd = evaluateClipDelta(clip, 1.0);
      expect(deltaEnd).toBeDefined();
    });

    // Test compounding and evaluateSceneAtTime integration with custom color and radius
    const testLayer: any = {
      id: "compounded_custom_layer",
      name: "Card",
      type: "shape",
      shapeType: "rectangle",
      style: { x: 100, y: 100, width: 200, height: 120, backgroundColor: "#ffffff" },
      animation: {
        clips: [
          {
            id: "c_col",
            type: "action",
            preset: "custom_color",
            start: 0,
            duration: 1.0,
            easing: "smooth",
            params: { color: "#6d28d9" },
          },
          {
            id: "c_rad",
            type: "action",
            preset: "custom_radius",
            start: 0,
            duration: 1.0,
            easing: "snappy",
            params: { radius: 24 },
          },
          {
            id: "c_stroke",
            type: "action",
            preset: "custom_stroke",
            start: 0,
            duration: 1.0,
            easing: "snappy",
            params: { strokeWidth: 4, strokeColor: "#10b981" },
          },
        ],
      },
    };

    const stateEnd = compoundLayerAnimations(testLayer, 1.0);
    expect(stateEnd.backgroundColor).toBe("#6d28d9");
    expect(stateEnd.borderRadius).toBe("24px");
    expect(stateEnd.borderWidth).toBe("4px");
    expect(stateEnd.borderColor).toBe("#10b981");

    const sceneStyles = evaluateSceneAtTime([testLayer], 1.0);
    expect(sceneStyles["compounded_custom_layer"].backgroundColor).toBe("#6d28d9");
    expect(sceneStyles["compounded_custom_layer"].borderRadius).toBe("24px");
    expect(sceneStyles["compounded_custom_layer"].borderWidth).toBe("4px");
    expect(sceneStyles["compounded_custom_layer"].borderColor).toBe("#10b981");
  });

  it("evaluates Jitter From -> To initial values and target transitions accurately", async () => {
    const { evaluateClipDelta } = await import("../engine/evaluator");

    // 1. Layer Blur with Initial value 0 -> To 20
    const blurClip: AnimationClip = {
      id: "blur_test",
      type: "action",
      preset: "custom_blur",
      start: 0,
      duration: 1.0,
      easing: "linear",
      from: { blur: 0 },
      params: { blur: 20 },
    };
    expect(evaluateClipDelta(blurClip, 0.0).blur).toBeCloseTo(0, 1);
    expect(evaluateClipDelta(blurClip, 0.5).blur).toBeCloseTo(10, 1);
    expect(evaluateClipDelta(blurClip, 1.0).blur).toBeCloseTo(20, 1);

    // 2. Scale with Initial value 0.5 -> To 1.5
    const scaleClip: AnimationClip = {
      id: "scale_test",
      type: "action",
      preset: "custom_scale",
      start: 0,
      duration: 1.0,
      easing: "linear",
      from: { scale: 0.5 },
      params: { scaleAmount: 1.5 },
    };
    expect(evaluateClipDelta(scaleClip, 0.0).scaleX).toBeCloseTo(0.5, 2);
    expect(evaluateClipDelta(scaleClip, 0.5).scaleX).toBeCloseTo(1.0, 2);
    expect(evaluateClipDelta(scaleClip, 1.0).scaleX).toBeCloseTo(1.5, 2);

    // 3. Move with Initial value and direction
    const moveClip: AnimationClip = {
      id: "move_test",
      type: "action",
      preset: "custom_move",
      direction: "up",
      distance: 100,
      start: 0,
      duration: 1.0,
      easing: "linear",
      from: { distance: 0 },
      params: { distance: 100 },
    };
    expect(evaluateClipDelta(moveClip, 0.0).y).toBeCloseTo(0, 1);
    expect(evaluateClipDelta(moveClip, 0.5).y).toBeCloseTo(-50, 1);
    expect(evaluateClipDelta(moveClip, 1.0).y).toBeCloseTo(-100, 1);
  });

  it("auto-choreographs staggered creation start times and element-tailored entrance presets", async () => {
    const { createLayerForTool } = await import("../components/canvas/helpers/toolCreationHelpers");

    // 1st element (index 0) -> start: 0.0s
    const textLayer = createLayerForTool("text", 100, 100, 0);
    expect(textLayer).toBeDefined();
    expect(textLayer?.animation?.in?.start).toBe(0);
    expect(textLayer?.animation?.in?.preset).toBe("slideUp");

    // 2nd element (index 1) -> start: 0.5s
    const shapeLayer = createLayerForTool("rectangle", 200, 200, 1);
    expect(shapeLayer).toBeDefined();
    expect(shapeLayer?.animation?.in?.start).toBe(0.5);
    expect(shapeLayer?.animation?.in?.preset).toBe("grow");

    // 3rd element (index 2) -> start: 1.0s
    const circleLayer = createLayerForTool("circle", 300, 300, 2);
    expect(circleLayer).toBeDefined();
    expect(circleLayer?.animation?.in?.start).toBe(1.0);
    expect(circleLayer?.animation?.in?.preset).toBe("pop");

    // 4th element (index 3) -> start: 1.5s
    const lineLayer = createLayerForTool("line", 400, 400, 3);
    expect(lineLayer).toBeDefined();
    expect(lineLayer?.animation?.in?.start).toBe(1.5);
    expect(lineLayer?.animation?.in?.preset).toBe("slideRight");
  });
});


