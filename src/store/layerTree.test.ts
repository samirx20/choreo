import { describe, it, expect, beforeEach } from "vitest";
import { useProjectStore, INITIAL_SCENE } from "./useProjectStore";
import { Layer, GroupLayer } from "@/types/scene";

describe("useProjectStore Layer Tree Operations", () => {
  beforeEach(() => {
    useProjectStore.setState({
      document: JSON.parse(JSON.stringify(INITIAL_SCENE)),
      selectedLayerIds: [],
      editingLayerId: null,
      activeTextSelection: null,
      activeScreenId: "screen_1",
    });
  });

  it("groups selected layers into a new GroupLayer with calculated bounding box", () => {
    const store = useProjectStore.getState();

    const layer1: Layer = {
      id: "layer_card_1",
      name: "Card 1",
      type: "shape",
      shapeType: "rectangle",
      style: { x: 100, y: 150, width: 300, height: 200, rotation: 0, opacity: 1 },
    };
    const layer2: Layer = {
      id: "layer_text_1",
      name: "Text 1",
      type: "text",
      content: "Hello",
      style: { x: 120, y: 180, width: 200, height: 50, rotation: 0, opacity: 1 },
    };

    store.addLayer(layer1);
    store.addLayer(layer2);

    useProjectStore.setState({ selectedLayerIds: ["layer_card_1", "layer_text_1"] });
    useProjectStore.getState().groupSelection();

    const currentLayers = useProjectStore.getState().document.screens[0].layers;
    const newGroup = currentLayers[currentLayers.length - 1];

    expect(newGroup.type).toBe("group");
    if (newGroup.type === "group") {
      expect(newGroup.children.length).toBe(2);
      expect(newGroup.children.map((c) => c.id)).toContain("layer_card_1");
      expect(newGroup.children.map((c) => c.id)).toContain("layer_text_1");
      // Bounding box should wrap x: 100 to 400 (width 300), y: 150 to 350 (height 200)
      expect(newGroup.style.x).toBe(100);
      expect(newGroup.style.y).toBe(150);
      expect(newGroup.style.width).toBe(300);
      expect(newGroup.style.height).toBe(200);
      // Children styles should be relative to group (x: 0, y: 0 for layer1; x: 20, y: 30 for layer2)
      const child1 = newGroup.children.find((c) => c.id === "layer_card_1");
      const child2 = newGroup.children.find((c) => c.id === "layer_text_1");
      expect(child1?.style.x).toBe(0);
      expect(child1?.style.y).toBe(0);
      expect(child2?.style.x).toBe(20);
      expect(child2?.style.y).toBe(30);
    }
  });

  it("splits text range into selection and remainder chunks", () => {
    const store = useProjectStore.getState();
    const textLayer: Layer = {
      id: "test_text_layer",
      name: "Sentence",
      type: "text",
      content: "Hello beautiful world",
      style: { x: 200, y: 300, width: 400, height: 60, rotation: 0, opacity: 1, fontSize: 32 },
    };
    store.addLayer(textLayer);

    // Split "beautiful" (indices 6 to 15)
    useProjectStore.getState().splitTextRange("test_text_layer", 6, 15);

    const updatedLayers = useProjectStore.getState().document.screens[0].layers;
    const group = updatedLayers.find(
      (l) => l.type === "group" && l.id !== "group_hero" && (l as any).children?.length === 2
    );
    expect(group).toBeDefined();

    if (group && group.type === "group") {
      expect(group.children.length).toBe(2);
      expect((group.children[0] as any).content).toBe("beautiful");
      expect((group.children[1] as any).content).toBe("Hello world");
      // Selected chunk has bouncy pop preset
      expect((group.children[0] as any).animation.in.preset).toBe("pop");
    }
  });

  it("merges chunk into previous chunk on backspace at index 0 and dissolves group when single child left", () => {
    const store = useProjectStore.getState();
    const textLayer: Layer = {
      id: "merge_test_text",
      name: "Two Words",
      type: "text",
      content: "First Second",
      style: { x: 200, y: 300, width: 300, height: 50, rotation: 0, opacity: 1 },
    };
    store.addLayer(textLayer);

    // Split "Second" (indices 6 to 12) -> creates group with selection "Second" and remainder "First"
    useProjectStore.getState().splitTextRange("merge_test_text", 6, 12);

    let updatedLayers = useProjectStore.getState().document.screens[0].layers;
    let group = updatedLayers.find(
      (l) => l.type === "group" && l.id !== "group_hero" && (l as any).children?.length === 2
    );
    expect(group).toBeDefined();

    if (group && group.type === "group") {
      const secondChunkId = group.children[1].id;
      // Merge second chunk back into first chunk
      useProjectStore.getState().mergeChunkWithPrevious(secondChunkId);

      const finalLayers = useProjectStore.getState().document.screens[0].layers;
      // Group should dissolve because only 1 child remains!
      const dissolvedGroup = finalLayers.find((l) => l.id === group!.id);
      expect(dissolvedGroup).toBeUndefined();

      const mergedLayer = finalLayers.find((l) => (l as any).content === "SecondFirst");
      expect(mergedLayer).toBeDefined();
    }
  });

  it("reorders layers relative to each other (before, after, inside group)", () => {
    const store = useProjectStore.getState();

    const cardLayer: Layer = {
      id: "test_card",
      name: "Card",
      type: "shape",
      shapeType: "rectangle",
      style: { x: 100, y: 100, width: 200, height: 200, rotation: 0, opacity: 1 },
    };
    const shapeLayer: Layer = {
      id: "test_shape",
      name: "Shape",
      type: "shape",
      shapeType: "rectangle",
      style: { x: 200, y: 200, width: 100, height: 100, rotation: 0, opacity: 1 },
    };

    store.addLayer(cardLayer);
    store.addLayer(shapeLayer);

    // Reorder shape before card
    useProjectStore.getState().reorderLayer("test_shape", "test_card", "before");

    const reorderedLayers = useProjectStore.getState().document.screens[0].layers;
    const shapeIdx = reorderedLayers.findIndex((l) => l.id === "test_shape");
    const cardIdx = reorderedLayers.findIndex((l) => l.id === "test_card");
    expect(shapeIdx).toBeLessThan(cardIdx);

    // Add a target group and reorder shape inside it
    const targetGroup: GroupLayer = {
      id: "test_target_group",
      name: "Target Group",
      type: "group",
      layout: { display: "flex", flexDirection: "column", gap: 8, align: "center" },
      autoFit: true,
      style: { x: 300, y: 300, width: 250, height: 250, rotation: 0, opacity: 1 },
      children: [],
    };
    store.addLayer(targetGroup);

    useProjectStore.getState().reorderLayer("test_shape", "test_target_group", "inside");
    const nestedLayers = useProjectStore.getState().document.screens[0].layers;
    const foundGroup = nestedLayers.find((l) => l.id === "test_target_group");
    expect(foundGroup?.type).toBe("group");
    if (foundGroup?.type === "group") {
      const reparentedChild = foundGroup.children.find((c) => c.id === "test_shape");
      expect(reparentedChild).toBeDefined();
      // Coordinate normalization: world x (200) - group x (300) = -100
      expect(reparentedChild?.style.x).toBe(-100);
      expect(reparentedChild?.style.y).toBe(-100);
    }
  });

  it("handles Z-index stacking operations (bringToFront, sendToBack, bringForward, sendBackward)", () => {
    const store = useProjectStore.getState();

    useProjectStore.setState((state) => ({
      document: {
        ...state.document,
        screens: [
          {
            ...state.document.screens[0],
            layers: [],
          },
        ],
      },
    }));

    const layerA: Layer = { id: "layer_a", name: "A", type: "shape", shapeType: "rectangle", style: { x: 0, y: 0, width: 100, height: 100, rotation: 0, opacity: 1 } };
    const layerB: Layer = { id: "layer_b", name: "B", type: "shape", shapeType: "rectangle", style: { x: 10, y: 10, width: 100, height: 100, rotation: 0, opacity: 1 } };
    const layerC: Layer = { id: "layer_c", name: "C", type: "shape", shapeType: "rectangle", style: { x: 20, y: 20, width: 100, height: 100, rotation: 0, opacity: 1 } };

    store.addLayer(layerA);
    store.addLayer(layerB);
    store.addLayer(layerC);

    // Initial order: [layer_a, layer_b, layer_c]
    let layers = useProjectStore.getState().document.screens[0].layers;
    expect(layers.map((l) => l.id)).toEqual(["layer_a", "layer_b", "layer_c"]);

    // Bring A forward (swap A and B) -> [layer_b, layer_a, layer_c]
    useProjectStore.getState().bringForward("layer_a");
    layers = useProjectStore.getState().document.screens[0].layers;
    expect(layers.map((l) => l.id)).toEqual(["layer_b", "layer_a", "layer_c"]);

    // Bring A to front -> [layer_b, layer_c, layer_a]
    useProjectStore.getState().bringToFront("layer_a");
    layers = useProjectStore.getState().document.screens[0].layers;
    expect(layers.map((l) => l.id)).toEqual(["layer_b", "layer_c", "layer_a"]);

    // Send A backward (swap A and C) -> [layer_b, layer_a, layer_c]
    useProjectStore.getState().sendBackward("layer_a");
    layers = useProjectStore.getState().document.screens[0].layers;
    expect(layers.map((l) => l.id)).toEqual(["layer_b", "layer_a", "layer_c"]);

    // Send A to back -> [layer_a, layer_b, layer_c]
    useProjectStore.getState().sendToBack("layer_a");
    layers = useProjectStore.getState().document.screens[0].layers;
    expect(layers.map((l) => l.id)).toEqual(["layer_a", "layer_b", "layer_c"]);
  });
});
