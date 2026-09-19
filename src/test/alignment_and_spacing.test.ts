import { describe, it, expect, beforeEach } from "vitest";
import { useProjectStore, INITIAL_SCENE } from "@/store/useProjectStore";
import { Layer } from "@/types/scene";

describe("Spatial Alignment & Distribution Engine", () => {
  beforeEach(() => {
    useProjectStore.setState({
      document: {
        ...INITIAL_SCENE,
        screens: [
          {
            id: "screen_align_test",
            name: "Align Screen",
            duration: 5.0,
            layers: [
              {
                id: "layer_1",
                name: "Box 1",
                type: "shape",
                shapeType: "rectangle",
                style: { x: 100, y: 100, width: 200, height: 100, rotation: 0, opacity: 1 },
              } as Layer,
              {
                id: "layer_2",
                name: "Box 2",
                type: "shape",
                shapeType: "rectangle",
                style: { x: 400, y: 250, width: 100, height: 100, rotation: 0, opacity: 1 },
              } as Layer,
              {
                id: "layer_3",
                name: "Box 3",
                type: "shape",
                shapeType: "rectangle",
                style: { x: 800, y: 400, width: 200, height: 100, rotation: 0, opacity: 1 },
              } as Layer,
            ],
          },
        ],
      },
      activeScreenId: "screen_align_test",
      selectedLayerIds: ["layer_1", "layer_2", "layer_3"],
    });
  });

  it("aligns selected layers to left relative to selection bounds", () => {
    const store = useProjectStore.getState();
    store.alignSelectedLayers("left", "selection");

    const layers = useProjectStore.getState().document.screens[0].layers;
    expect(layers[0].style.x).toBe(100);
    expect(layers[1].style.x).toBe(100);
    expect(layers[2].style.x).toBe(100);
  });

  it("aligns selected layers to right relative to selection bounds", () => {
    const store = useProjectStore.getState();
    // Selection max right edge is layer_3 at x=800 + w=200 = 1000
    store.alignSelectedLayers("right", "selection");

    const layers = useProjectStore.getState().document.screens[0].layers;
    // layer_1 has w=200 -> 1000 - 200 = 800
    expect(layers[0].style.x).toBe(800);
    // layer_2 has w=100 -> 1000 - 100 = 900
    expect(layers[1].style.x).toBe(900);
    // layer_3 has w=200 -> 1000 - 200 = 800
    expect(layers[2].style.x).toBe(800);
  });

  it("aligns selected layers to horizontal center relative to canvas", () => {
    const store = useProjectStore.getState();
    // Canvas width is 1920, center is 960
    store.alignSelectedLayers("center", "canvas");

    const layers = useProjectStore.getState().document.screens[0].layers;
    // layer_1: w=200 -> 960 - 100 = 860
    expect(layers[0].style.x).toBe(860);
    // layer_2: w=100 -> 960 - 50 = 910
    expect(layers[1].style.x).toBe(910);
    // layer_3: w=200 -> 960 - 100 = 860
    expect(layers[2].style.x).toBe(860);
  });

  it("distributes horizontal spacing evenly between outer layers", () => {
    const store = useProjectStore.getState();
    store.distributeSpacing("horizontal");

    const layers = useProjectStore.getState().document.screens[0].layers;
    // Layer 1 left=100, w=200 -> right=300
    // Layer 3 left=800, w=200 -> right=1000
    // Total span: 1000 - 100 = 900
    // Total layer widths: 200 + 100 + 200 = 500
    // Total gap = 400. With 2 gaps, gap = 200
    // Layer 1 at x=100
    // Layer 2 at x=100 + 200 + 200 = 500
    // Layer 3 at x=500 + 100 + 200 = 800
    expect(layers[0].style.x).toBe(100);
    expect(layers[1].style.x).toBe(500);
    expect(layers[2].style.x).toBe(800);
  });

  it("tidyUpSelection aligns middle and distributes horizontal spacing for horizontal arrangements", () => {
    const store = useProjectStore.getState();
    store.tidyUpSelection();

    const layers = useProjectStore.getState().document.screens[0].layers;
    expect(layers[0].style.x).toBe(100);
    expect(layers[1].style.x).toBe(500);
    expect(layers[2].style.x).toBe(800);
    // All should be aligned to middle Y
    expect(layers[0].style.y).toBe(layers[1].style.y);
    expect(layers[1].style.y).toBe(layers[2].style.y);
  });
});
