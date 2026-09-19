import { describe, it, expect, beforeEach } from "vitest";
import { useProjectStore, findLayerInTree } from "../store/useProjectStore";
import { Layer, GroupLayer, AnimationConfig } from "../types/scene";

describe("Animate Inspector & Motion Matrix Tests", () => {
  beforeEach(() => {
    const state = useProjectStore.getState();
    state.deselectAll();
    state.setEditingLayerId(null);
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
});
