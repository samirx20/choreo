import { describe, it, expect, beforeEach } from "vitest";
import { useProjectStore, INITIAL_SCENE } from "./useProjectStore";
import { Layer } from "@/types/scene";

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

  it("splits text range into prefix, target highlight chunk, and suffix", () => {
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
      (l) => l.type === "group" && l.id !== "group_hero" && (l as any).children?.length === 3
    );
    expect(group).toBeDefined();

    if (group && group.type === "group") {
      expect(group.children.length).toBe(3);
      expect((group.children[0] as any).content).toBe("Hello ");
      expect((group.children[1] as any).content).toBe("beautiful");
      expect((group.children[2] as any).content).toBe(" world");
      // Target chunk has bouncy pop preset
      expect((group.children[1] as any).animation.in.preset).toBe("pop");
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

    // Split "Second" (indices 6 to 12) -> creates group with prefix "First " and highlight "Second"
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

      const mergedLayer = finalLayers.find((l) => (l as any).content === "First Second");
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

    // Reorder shape inside the hero group
    useProjectStore.getState().reorderLayer("test_shape", "group_hero", "inside");
    const nestedLayers = useProjectStore.getState().document.screens[0].layers;
    const heroGroup = nestedLayers.find((l) => l.id === "group_hero");
    expect(heroGroup?.type).toBe("group");
    if (heroGroup?.type === "group") {
      expect(heroGroup.children.some((c) => c.id === "test_shape")).toBe(true);
    }
  });
});
